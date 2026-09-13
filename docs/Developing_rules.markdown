
## 1. Development Principles

- Keep controllers thin.
- Business rules belong to the Business layer.
- Database access belongs to the Data Access layer.
- Domain must not depend on API.
- Avoid unnecessary complexity.
- Prefer simple and maintainable solutions.
- **Every feature must be reviewed before merging.**
- *Do not hard-delete, always soft-delete.*

---

## 2. Git Rules

- `main` is the stable branch.
- Members developing branch always start with `dev/<member name>`
- Features must be developed in feature branches.
- No direct push to `main`.
- Pull Request is required before merging.
- Always using git commit principle.
- Developing on **your branch** first, deploy to **main** later.