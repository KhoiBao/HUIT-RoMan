> Kiến trúc chốt theo General_Info: **N-Layer + Modular Monolith**.
> Quy tắc code theo Developing_rules: controller thin, rule ở Business, DB ở Data Access, Domain không phụ thuộc API.
> Nghiệp vụ (role, vòng đời đơn): `docs/nghiep-vu.md` — không định nghĩa lại ở đây.

---

## 1. Cây thư mục thực tế

```text
backend/
  HUIT-RoMan.sln
  src/
    API/                  # Layer 1 - Presentation
      Program.cs          # AddControllers + CORS policy "Web" + AddDbContext + AddIdentity + JWT + Swagger
      appsettings.json    # ConnectionStrings:DefaultConnection -> PostgreSQL LibraryDb
      Controllers/        # chỉ gọi Service, cấm new DbContext ở đây (10 controllers: Auth, Bookings,
                          # Departments, Employees, Equipments, EquipmentCategories, Rooms, RoomTypes, Users, Health)
    Application/          # Layer 2 - Business
      DependencyInjection.cs   # AddApplication() đăng ký Service
      Common/             # IRepository, IUnitOfWork, IStoredProcedureService, ICurrentUserService, ApiResponse
      Modules/            # Modular Monolith = chia folder, chung 1 DB + 1 deploy
        Identity/ Booking/ Room/         # đã có Service
        Usage/ Reporting/ Communication/ # còn trống, làm sau
    Domain/               # Layer 4 - không ref project nào
      *.cs                # entities: User, Room, Booking, Equipment...
    Infrastructure/       # Layer 3 - Data Access
      Persistence/
        ApplicationDbContext.cs   # IdentityDbContext<User, IdentityRole<int>, int>
        ApplicationDbSeeder.cs    # seed roles + departments + 17 acc demo + apply StoredProcedures.sql
        Configurations/           # còn trống, tách Fluent API ra khi DbContext lớn lên
      Migrations/         # dotnet ef tạo ở đây
      Repositories/       # Repository, UnitOfWork, StoredProcedureService
      SQL/StoredProcedures.sql    # GetAvailableRooms, GetRoomSchedule, ... (một số proc chưa có code gọi)
```

Chiều phụ thuộc: `API -> Application -> Domain <- Infrastructure`.
`API` ref `Application + Infrastructure` chỉ để DI. `Domain` cấm `using` tới 3 project còn lại.

## 2. Module map từ project_scope

| Module folder | Entities | Ưu tiên |
|---|---|---|
| `Identity` | User, Department, Employee, UserRestriction | Must |
| `Room` | Room, RoomType, Equipment, EquipmentCategory, RoomEquipment, EquipmentConditionLog, MaintenanceRecord, UsageCondition, RoomTypeCondition | Must |
| `Booking` | Booking, BookingDetail | Must |
| `Usage` (trống) | UsageSession, Period, Shift, ShiftLog — check-in/out | Must, làm sau |
| `Reporting` (trống) | Báo cáo/thống kê qua proc `GetBookingSummary` | Must, làm sau |
| `Communication` (trống) | Notification, ChatConversation, ChatMessage, Feedback | Could, làm sau |

Luồng chuẩn 1 tính năng: `Controller (API) -> Service (Application/Modules/X) -> DbContext/Repository (Infrastructure) -> PostgreSQL`.
Module khác muốn dùng chéo thì gọi qua Service (`IRoomService.IsAvailable()`), không `.Include()` DbSet của module khác.

## 3. Package đang dùng (khóa version, đừng tự nâng)

**Domain** (`HUIT-RoMan.Domain.csproj`):

```powershell
dotnet add src/Domain/HUIT-RoMan.Domain.csproj package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 8.0.11
```

**Infrastructure** (`HUIT-RoMan.Infrastructure.csproj`):

```powershell
dotnet add src/Infrastructure/HUIT-RoMan.Infrastructure.csproj package Microsoft.EntityFrameworkCore --version 8.0.11
dotnet add src/Infrastructure/HUIT-RoMan.Infrastructure.csproj package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.11
dotnet add src/Infrastructure/HUIT-RoMan.Infrastructure.csproj package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 8.0.11
dotnet add src/Infrastructure/HUIT-RoMan.Infrastructure.csproj package Microsoft.EntityFrameworkCore.Design --version 8.0.11
```

**API** (`HUIT-RoMan.API.csproj`, đã có sẵn `OpenApi 8.0.31 + Swashbuckle 6.6.2`):

```powershell
dotnet add src/API/HUIT-RoMan.API.csproj package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.30
# BẮT BUỘC cho dotnet-ef, thiếu là báo lỗi startup project
dotnet add src/API/HUIT-RoMan.API.csproj package Microsoft.EntityFrameworkCore.Design --version 8.0.11
```

Thêm reference giữa các layer (đã làm sẵn, chỉ chạy khi tạo project mới):

```powershell
dotnet add src/Application/HUIT-RoMan.Application.csproj reference src/Domain/HUIT-RoMan.Domain.csproj
dotnet add src/Infrastructure/HUIT-RoMan.Infrastructure.csproj reference src/Domain/HUIT-RoMan.Domain.csproj
dotnet add src/API/HUIT-RoMan.API.csproj reference src/Application/HUIT-RoMan.Application.csproj src/Infrastructure/HUIT-RoMan.Infrastructure.csproj
```

## 4. Thêm 1 tính năng mới đúng chuẩn (ví dụ Room)

1. Entity có sẵn ở `Domain/Room.cs` thì không tạo lại, thiếu thì tạo mới ở `Domain/`.
2. Viết interface + service ở `Application/Modules/Room/` (rule kiểm phòng trống, validate ở đây).
3. Đăng ký service vào `Application/DependencyInjection.cs`.
4. Viết controller thin ở `API/Controllers/RoomsController.cs` (nhận DTO -> gọi service -> trả kết quả).
5. Nếu đổi entity: `dotnet ef migrations add ThemX --project src/Infrastructure --startup-project src/API`.

