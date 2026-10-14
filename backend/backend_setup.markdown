> Dành cho thành viên mới. Chạy file `.bat` ở root repo, không cần gõ lệnh tay.

## 1. Cài đặt 1 lần duy nhất

```bat
setup.bat
```

File này kiểm tra `.NET 8 SDK` + `Node.js`, cài `dotnet-ef` nếu thiếu, `dotnet restore` backend, `npm install` web. Thiếu gì nó báo link tải.

Cần thêm: **PostgreSQL đang chạy ở `localhost:5432`**, tạo DB trống tên `LibraryDb` (user/pass xem ở `backend/src/API/appsettings.json`).

## 2. Clone + branch (bắt buộc theo Developing_rules)

```powershell
git clone <repo-url>
cd HUIT-RoMan
git checkout -b dev/<ten-ban>
# cấm push thẳng main, xong việc thì mở Pull Request
```

## 3. Chạy mỗi ngày (2 cửa sổ riêng)

```bat
update-db.bat    :: lần đầu, hoặc sau khi pull code có migration mới
run-backend.bat  :: API http://localhost:5056 — Swagger http://localhost:5056/swagger — Health GET /api/health
run-web.bat      :: Web http://localhost:5173
```

Thứ tự bắt buộc: DB → backend → web. Tài khoản demo xem ở `backend/account.md` (pass chung `Huit@123`).

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
| Web báo CORS / Network Error khi login | Backend chưa chạy, hoặc chạy sai port. Web gọi đúng `http://localhost:5056` (xem `web/.env.development`) |
| `git status` hiện `m db_Library` | `db_Library/` là code cũ còn sót + có `.git` lồng bên trong. Không code ở đó nữa, chỉ code ở `backend/`. Team thống nhất xong thì xóa hẳn folder `db_Library/` |
