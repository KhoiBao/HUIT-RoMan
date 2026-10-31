# RoMan — Runbook cho team

Tài liệu này là điểm bắt đầu cho mọi thành viên. Mở file, làm theo đúng thứ tự là chạy được dự án mà không cần hỏi lại.

---

## 0. Chọn cách chạy

| Cách | Dùng khi | Có hot-reload? |
|---|---|---|
| **Docker** | Demo, test tích hợp, kiểm tra trước khi commit/PR | Không |
| **Local** | Đang code, fix, thêm tính năng | Có (frontend HMR, backend có thể dùng `dotnet watch`) |

> **Quy tắc:** không chạy Docker và local cùng lúc, vì cả hai dùng cổng `5056` và `5173`. Chuyển qua lại thì tắt cái cũ trước.

---

## 1. Yêu cầu môi trường

### Chạy bằng Docker

- Windows 10/11, macOS hoặc Linux.
- **Docker Desktop** đang chạy.
- Git.

Kiểm tra:

```powershell
docker --version
docker compose version
docker info
```

Nếu `docker info` báo `failed to connect to the docker API`, mở Docker Desktop và chờ engine sẵn sàng.

### Chạy local

- .NET 8 SDK.
- Node.js 20.19+ hoặc 22.12+.
- PostgreSQL 16 (mặc định `localhost:5432`).

Kiểm tra:

```powershell
dotnet --version
node --version
```

---

## 2. Cấu hình

Tại thư mục gốc dự án:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và chỉnh khi cần:

```dotenv
POSTGRES_DB=LibraryDb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123
DB_PORT=5433
API_PORT=5056
WEB_PORT=5173
JWT_SECRET=super_secret_key_for_development_huit_roman_12345
ASPNETCORE_ENVIRONMENT=Development
```

- Không commit `.env`.
- Nếu bỏ qua bước này, Docker vẫn chạy với giá trị demo mặc định.
- Mật khẩu database nên tránh ký tự `;` vì có thể làm hỏng connection string.
- Đổi `JWT_SECRET` và mật khẩu trước khi triển khai thật.

### Cổng mặc định

| Thành phần | Trong Docker | Từ máy host |
|---|---|---|
| Web | `80` | `http://localhost:5173` |
| API | `8080` | `http://localhost:5056` |
| PostgreSQL | `5432` | `localhost:5433` |

`DB_PORT=5433` để không đụng PostgreSQL local thường dùng `5432`.

---

## 3. Chạy nhanh bằng Docker

```powershell
docker compose up --build -d
docker compose ps
```

Lần đầu sẽ tải image và build, mất vài phút. Các bước tự động:

1. `db` khởi động và healthy.
2. `api` build, tự áp migration rồi seed dữ liệu demo.
3. `api` healthy qua `/api/health`.
4. `web` phục vụ React bằng Nginx và proxy `/api`.

Mở:

- **Web:** <http://localhost:5173>
- **Swagger:** <http://localhost:5056/swagger>
- **Health:** <http://localhost:5056/api/health>

### Tài khoản demo

Mật khẩu chung: `Huit@123`

| Vai trò | Email |
|---|---|
| Sinh viên | `200123456@huit.edu.vn` |
| Thủ thư | `tv001@huit.edu.vn` |
| Quản lý phòng | `qlp001@huit.edu.vn` |
| Admin | `admin02@huit.edu.vn` |

Admin seed cũ: `admin@huit.edu.vn` / `Admin@123`. Danh sách đầy đủ ở `backend/account.md`.

### 3.1. Build APK Android bằng Docker

Máy không cần cài Flutter hay Android SDK. Service `mobile` nằm trong profile riêng nên không bị build khi chạy `docker compose up`:

```powershell
docker compose --profile mobile run --rm mobile
```

- Lần đầu tải image Flutter + Android SDK, build APK mất khoảng 10–20 phút; các lần sau dùng cache.
- Kết quả: `mobile_app/build/docker/app-debug.apk` (đã dùng cho emulator/máy thật).
- API mà APK gọi tới lấy từ `MOBILE_API_BASE_URL` trong `.env` (mặc định `http://10.0.2.2:5056`, tức localhost của host nhìn từ emulator). Muốn build cho máy thật, đổi sang IP LAN của máy chạy API rồi build lại.
- Chỉ build lại image khi đổi `Dockerfile` hoặc `pubspec`; sửa code Dart thì `run` lại là đủ vì bước copy mã nguồn nằm sau `flutter pub get`.

Cài APK lên emulator:

```powershell
adb install -r mobile_app/build/docker/app-debug.apk
```

---

## 4. Quy trình làm việc hằng ngày

### 4.1. Đang code — chạy local

Docker image không có hot-reload. Khi đang sửa code, dùng local cho nhanh:

```powershell
docker compose down
```

Mở **2 terminal**:

```bat
:: Terminal 1 — API
run-backend.bat
```

```bat
:: Terminal 2 — Web
run-web.bat
```

- Sửa frontend: Vite tự reload.
- Sửa backend: dừng `run-backend.bat` rồi chạy lại, hoặc dùng:

```powershell
cd backend
dotnet watch run --project src/API --launch-profile http
```

- Sửa schema database: chạy `update-db.bat`.
- Web local: <http://localhost:5173>
- API local: <http://localhost:5056>

> Database local (`5432`) và database Docker (`5433`) là **hai database riêng biệt**. Dữ liệu không tự đồng bộ. Nếu chuyển qua lại, cần seed lại hoặc dùng đúng database mình muốn.

### 4.2. Kiểm tra bằng Docker sau khi sửa

| Bạn sửa gì | Lệnh |
|---|---|
| Backend / API | `docker compose up -d --build api` |
| Frontend / React | `docker compose up -d --build web` |
| Cả hai | `docker compose up -d --build` |
| Dockerfile, compose, Nginx, `.env` | `docker compose up -d --build --force-recreate` |

**Sai lầm thường gặp:** `docker compose restart api` chỉ khởi động lại container cũ, **không nạp code mới**. Muốn nạp code mới phải có `--build`.

Kiểm tra:

```powershell
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

Nếu trình duyệt vẫn hiện giao diện cũ: nhấn `Ctrl + F5`.

### 4.3. Khi nào cần build lại?

- Sửa bất kỳ file `.cs` → build lại `api`.
- Sửa bất kỳ file trong `web/src`, CSS, asset → build lại `web`.
- Sửa `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.env` → build lại và recreate.
- Chỉ xem log, restart container, hoặc dữ liệu database thay đổi → không cần build lại.

---

## 5. Thay đổi database / migration

### 5.1. Thêm migration

Tại thư mục `backend`:

```powershell
dotnet ef migrations add TenMigration --project src/Infrastructure --startup-project src/API
```

Sau đó:

- **Local:** chạy `update-db.bat`.
- **Docker:** `docker compose up -d --build api`.

Container API sẽ tự chạy migration trước khi seed vì có `Database__AutoMigrate=true`.

### 5.2. Lưu ý về dữ liệu

- Volume Docker giữ database qua các lần `docker compose down` và `restart`.
- `docker compose down -v` sẽ **xóa sạch database**, lần chạy sau mới seed lại.
- Seeder chỉ thêm dữ liệu còn thiếu; sửa code seeder không tự cập nhật dữ liệu đã có trong volume cũ. Muốn thấy dữ liệu seed mới, phải reset volume hoặc sửa dữ liệu trực tiếp.
- Trước migration có thay đổi/xóa cột, nên backup dữ liệu quan trọng.

### 5.3. Kết nối database Docker từ DBeaver/pgAdmin

- Host: `localhost`
- Port: `5433`
- Database: `LibraryDb`
- User: `postgres`
- Password: giá trị `POSTGRES_PASSWORD` trong `.env`

---

## 6. Trước khi commit / mở Pull Request

Chạy đầy đủ:

```powershell
# Backend
cd backend
dotnet build HUIT-RoMan.sln

# Frontend
cd ..\web
npm test
npm run build
npm run lint
```

Sau đó kiểm tra bằng Docker:

```powershell
cd ..
docker compose up --build -d
```

Checklist thủ công:

- [ ] Web mở được, không lỗi console.
- [ ] Đăng nhập được.
- [ ] Chức năng vừa sửa hoạt động.
- [ ] API liên quan trả đúng dữ liệu.
- [ ] `docker compose ps` cả 3 service healthy.
- [ ] Không commit `.env`, log, `bin/`, `obj/`, `node_modules/`, `dist/`.

Quy tắc nhánh: làm trên `dev/<tên>` hoặc `feature/<tính-năng>`, mở Pull Request, không push thẳng `main`.

---

## 7. Lệnh thường dùng

| Mục đích | Lệnh |
|---|---|
| Chạy hệ thống | `docker compose up -d` |
| Build lại và chạy | `docker compose up --build -d` |
| Build lại một service | `docker compose up -d --build api` |
| Xem trạng thái | `docker compose ps` |
| Xem log | `docker compose logs -f api` |
| Restart container (không build lại) | `docker compose restart api` |
| Dừng, giữ dữ liệu | `docker compose down` |
| Dừng và xóa database | `docker compose down -v` |
| Vào shell API | `docker compose exec api sh` |
| Vào PostgreSQL | `docker compose exec db psql -U postgres -d LibraryDb` |
| Build lại không dùng cache | `docker compose build --no-cache api web` |
| Build APK Android | `docker compose --profile mobile run --rm mobile` |
| Build lại image APK | `docker compose --profile mobile build mobile` |
| Kiểm tra cấu hình compose | `docker compose config` |

---

## 8. Xử lý sự cố

### Docker báo port is already allocated

Một tiến trình local đang chiếm cổng. Kiểm tra:

```powershell
Get-NetTCPConnection -LocalPort 5173,5056 -State Listen
```

Tắt `run-web.bat`, `run-backend.bat`, Vite hoặc đổi cổng trong `.env`. Sau đó:

```powershell
docker compose up -d
```

### Mở localhost:5173 thấy giao diện Vite cũ

Vite dev server local vẫn đang chạy. Tắt nó rồi mở lại `http://localhost:5173`. Kiểm tra nhanh:

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen
```

### Container API không healthy

```powershell
docker compose logs api
```

Thường do:

- Database chưa sẵn sàng.
- Sai `POSTGRES_PASSWORD` trong `.env`.
- Volume cũ có mật khẩu khác.
- Migration hoặc seed lỗi.

Thử reset sạch nếu chấp nhận mất dữ liệu:

```powershell
docker compose down -v
docker compose up --build -d
```

### Web mở được nhưng gọi API bị 502

API chưa healthy. Kiểm tra:

```powershell
Invoke-RestMethod http://localhost:5056/api/health
docker compose logs -f api
```

### Đã sửa code nhưng Docker vẫn chạy bản cũ

Bạn đã dùng `restart` thay vì build lại:

```powershell
docker compose up -d --build
```

Nếu vẫn sai, thử:

```powershell
docker compose build --no-cache api web
docker compose up -d
```

### Thay đổi `.env` nhưng không có tác dụng

Recreate container:

```powershell
docker compose up -d --force-recreate
```

### Docker Desktop không khởi động

- Mở Docker Desktop, chờ Engine running.
- Kiểm tra WSL 2 đã bật.
- Kiểm tra virtualization trong BIOS/UEFI.
- Khởi động lại máy nếu Docker Desktop vừa được cài.

---

## 9. Ghi chú triển khai thật

Cấu hình hiện tại phù hợp demo/dev trên máy cá nhân:

- Không dùng mật khẩu/JWT mặc định.
- Đặt `ASPNETCORE_ENVIRONMENT=Production` để tắt Swagger.
- Không public trực tiếp `5056` hoặc `5433` ra Internet.
- Chỉ public web qua reverse proxy có HTTPS.
- Nên tách database managed, secret manager và pipeline CI/CD khi lên production.

---

## 10. Cấu trúc file Docker trong repo

```text
HUIT-RoMan/
  docker-compose.yml
  .env.example
  backend/
    Dockerfile
    .dockerignore
  web/
    Dockerfile
    .dockerignore
    nginx.conf
  mobile_app/
    Dockerfile
    .dockerignore
  docs/
    docker.md        # file này
```

Kiến trúc:

```text
Trình duyệt
    │
    ▼
web (Nginx :80) ──/api/*──▶ api (.NET 8 :8080) ──▶ db (PostgreSQL :5432)
    │                              │
    └── React SPA                  └── tự migration + seed
```
