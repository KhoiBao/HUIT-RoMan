> Dành cho thành viên mới. Chỉ cần chạy theo thứ tự từ trên xuống.
> Mọi lệnh chạy trên Windows PowerShell.

---

## 1. Cài đặt 1 lần duy nhất

```powershell
# .NET 8 SDK (project target net8.0)
dotnet --version
# dotnet-ef dùng để migration
dotnet tool install --global dotnet-ef
dotnet ef --version
```

Cần thêm: PostgreSQL đang chạy ở `localhost:5432`, tạo DB trống tên `LibraryDb`
(user `postgres` theo `backend/src/API/appsettings.json`).

## 2. Clone + branch (bắt buộc theo Developing_rules)

```powershell
git clone <repo-url>
cd HUIT-RoMan
git checkout -b dev/<ten-ban>
# cấm push thẳng main, xong việc thì mở Pull Request vào main
```

## 3. Chạy backend mỗi ngày

```powershell
cd backend

dotnet restore HUIT-RoMan.sln
dotnet build HUIT-RoMan.sln --nologo

# cập nhật database khi có thay đổi
dotnet ef database update --project src/Infrastructure --startup-project src/API

# chạy API
dotnet run --project src/API
```

Mở kiểm tra:

- Swagger: `https://localhost:7181/swagger` (port xem ở `src/API/Properties/launchSettings.json`)
- Health: `GET /api/health` -> `{ "status": "ok" }`

## 4. Lệnh dùng khi code tính năng mới

```powershell
cd backend

# thêm migration sau khi sửa entity trong src/Domain
dotnet ef migrations add <TenMigration> --project src/Infrastructure --startup-project src/API
dotnet ef database update --project src/Infrastructure --startup-project src/API

# xem DbContext hiện có
dotnet ef dbcontext list --project src/Infrastructure --startup-project src/API

# xem solution gồm project nào (phải gõ rõ tên file .sln)
dotnet sln HUIT-RoMan.sln list
```

## 5. Lỗi hay gặp

| Lỗi | Cách fix |
|---|---|
| `Specified solution file ... does not exist` khi `dotnet sln list` | Đang đứng sai folder hoặc thiếu tên file. Phải `cd backend` rồi chạy `dotnet sln HUIT-RoMan.sln list` |
| `doesn't reference Microsoft.EntityFrameworkCore.Design` | Thiếu package ở API. Chạy `dotnet add src/API/HUIT-RoMan.API.csproj package Microsoft.EntityFrameworkCore.Design --version 8.0.11` |
| Không connect PostgreSQL | Kiểm tra Postgres có chạy không, sửa chuỗi `DefaultConnection` trong `src/API/appsettings.json` |
| `git status` hiện `m db_Library` | `db_Library/` là code cũ còn sót + có `.git` lồng bên trong. Không code ở đó nữa, chỉ code ở `backend/`. Team thống nhất xong thì xóa hẳn folder `db_Library/` |
