> Version: 0.2.0
> Status: Active
> Last Updated: 14/10/2026

---

## 1. Project Information

| Field | Value |
|---|---|
| Project Code | CNTT-KLCN236 |
| Project Name | Xây dựng hệ thống quản lý đăng ký và khai thác phòng dùng chung tại Trường Đại học Công Thương Thành phố Hồ Chí Minh |
| Team Size | 3 |
| Start Date | 17/08/2026 |
| End Date | 08/11/2026 |

---

## 2. Project Objective

Xây dựng hệ thống ứng dụng
quản lý phòng họp trên hai nền tảng Web và Mobile, hỗ trợ việc thực hiện quản
lý và hoạt động theo nghiệp vụ đã phân tích, xây dựng kết xuất báo cáo thống kê
nhằm phục vụ khai thác phòng dùng chung tại trường Đại học Công thương TP
HCM.

---

## 3. Team Members

| Member | Role |
|---|---|
| Nguyen Bao Khoi | PM / Tech Lead |
| Nguyen Le Dang Khoa | Developer |
| Nguyen Thi Anh Thu | Developer |

---

## 4. Technology Stack

### Backend

- ASP.NET Core Web API 8.0 LTS
- Entity Framework Core

### Database

- PostgreSQL

### User Interface - UI

- ReactJS
- TypeScript

### Mobile Application

- Flutter
- Dart

### Development Tools

- Visual Studio Code
- Git/GitHub
- File `.bat` ở root repo (`setup`, `update-db`, `run-backend`, `run-web`)

### API

- REST API
- OpenAPI / Swagger (`http://localhost:5056/swagger`)

### Authentication

- JWT Bearer (login bằng email `@huit.edu.vn`, chưa có Refresh Token — xem `docs/nghiep-vu.md` mục 4)

### CI/CD

- Chưa có (làm sau nếu còn thời gian)

---

## 5. Architecture

The backend will use:

> N-Layer Architecture + Modular Monolith

### Layers

1. API / Presentation
2. Business
3. Data Access
4. Domain

