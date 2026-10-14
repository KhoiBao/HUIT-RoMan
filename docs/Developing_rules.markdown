
## 1. Development Principles

### Backend (ASP.NET Core)

- Keep controllers thin.
- Business rules belong to the Business layer.
- Database access belongs to the Data Access layer.
- Domain must not depend on API.
- Avoid unnecessary complexity.
- Prefer simple and maintainable solutions.
- **Every feature must be reviewed before merging.**
- Module khác muốn dùng chéo thì gọi qua Service, không `.Include()` DbSet của module khác.
- Thêm tính năng theo đúng 5 bước ở `backend/backend_structure.markdown` mục 4.

### Frontend (React)

- Logic thuần (validate, map, gọi API) nằm ở `web/src/lib/` kèm test `*.test.ts`. Component chỉ hiển thị.
- Không hardcode URL API — dùng instance `api` ở `web/src/lib/api.ts`.
- Route cần đăng nhập bọc trong `<RequireAuth>`. Không tự chế cơ chế auth mới.
- UI copy tiếng Việt, tên biến/hàm tiếng Anh.
- Chi tiết: `web/README.md`.

---

## 2. Git Rules

- `main` is the stable branch.
- Members developing branch always start with `dev/<member name>`
- Features must be developed in feature branches.
- No direct push to `main`.
- Pull Request is required before merging.
- Always using git commit principle.
- Developing on **your branch** first, deploy to **main** later.