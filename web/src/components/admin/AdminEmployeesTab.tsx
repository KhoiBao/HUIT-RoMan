import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { PlusIcon, SearchIcon, AlertTriangleIcon } from "../Icon";

export interface EmployeeItem {
  id: number;
  code: string;
  position: string;
  hireDate?: string;
  status: string;
  userId: number;
  userName: string;
  cardCode: string;
  fullName: string;
  email: string;
  departmentId?: number;
  departmentName?: string;
}

export interface DepartmentOption {
  id: number;
  name: string;
}

export interface UserOption {
  id: number;
  fullName: string;
  email: string;
  cardCode: string;
  role: string;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminEmployeesTab({ onNotify }: Props) {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal create
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createUserId, setCreateUserId] = useState<number | "">("");
  const [createPosition, setCreatePosition] = useState<string>("Thủ thư");

  // Modal edit
  const [editingEmp, setEditingEmp] = useState<EmployeeItem | null>(null);
  const [editPosition, setEditPosition] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("Active");
  const [editDeptId, setEditDeptId] = useState<number | "">("");

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, usersRes] = await Promise.all([
        api.get("/api/Employees"),
        api.get("/api/Departments"),
        api.get("/api/Users"),
      ]);
      setEmployees(empRes.data?.data || empRes.data || []);
      setDepartments(deptRes.data?.data || deptRes.data || []);
      setAllUsers(usersRes.data?.data || usersRes.data || []);
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      onNotify("Không thể tải danh sách nhân viên.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (e.code || "").toLowerCase().includes(q) ||
      (e.fullName || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      (e.departmentName || "").toLowerCase().includes(q)
    );
  });

  // Handle Create Employee
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserId) {
      alert("Vui lòng chọn người dùng để cấp quyền nhân viên.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post("/api/Employees", {
        userId: Number(createUserId),
        position: createPosition.trim(),
      });
      if (res.data?.success) {
        onNotify("Đã tạo hồ sơ nhân viên thành công!", "success");
        setShowCreateModal(false);
        setCreateUserId("");
        await fetchEmployees();
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi tạo hồ sơ nhân viên.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEdit = (emp: EmployeeItem) => {
    setEditingEmp(emp);
    setEditPosition(emp.position || "Thủ thư");
    setEditStatus(emp.status || "Active");
    setEditDeptId(emp.departmentId || "");
  };

  // Handle Edit Employee
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/api/Employees/${editingEmp.id}`, {
        position: editPosition.trim(),
        status: editStatus,
        departmentId: editDeptId ? Number(editDeptId) : null,
      });
      if (res.data?.success) {
        onNotify(`Đã cập nhật nhân viên ${editingEmp.fullName}!`, "success");
        setEditingEmp(null);
        await fetchEmployees();
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi cập nhật nhân viên.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDelete = async (emp: EmployeeItem) => {
    if (
      !window.confirm(
        `Xác nhận xóa hồ sơ nhân sự của "${emp.fullName}" (${emp.code})?\nVai trò Employee của tài khoản này sẽ được thu hồi.`
      )
    )
      return;
    try {
      const res = await api.delete(`/api/Employees/${emp.id}`);
      if (res.data?.success) {
        onNotify(`Đã xóa hồ sơ nhân viên ${emp.fullName}!`, "info");
        await fetchEmployees();
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi xóa nhân viên.",
        "warning"
      );
    }
  };

  return (
    <div className="admin-subtab-container">
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">👔 Quản lý danh mục nhân viên & Thủ thư</h2>
          <p className="admin-subtab-subtitle">
            Cấp quyền nhân sự quản lý, phân bổ vị trí trực thư viện và phòng máy.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={fetchEmployees}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "🔄 Làm mới"}
          </button>
          <button
            type="button"
            className="btn-toolbar-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon size={16} /> + Thêm nhân sự mới
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-box max-w-400">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã nhân viên, Họ tên, Email, Chức vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh sách nhân viên...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy nhân viên nào</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Chức vụ / Vị trí</th>
                <th>Email liên hệ</th>
                <th>Đơn vị công tác</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="code-tag">{e.code || `#${e.id}`}</span>
                  </td>
                  <td className="font-semibold text-highlight">{e.fullName || e.userName}</td>
                  <td>
                    <span className="badge-position">{e.position || "Thủ thư"}</span>
                  </td>
                  <td className="text-xs text-muted">{e.email}</td>
                  <td>{e.departmentName || "Thư viện HUIT"}</td>
                  <td>
                    <span
                      className={`admin-status-pill ${
                        e.status === "Active" || e.status === "Hoạt động"
                          ? "pill-approved"
                          : "pill-rejected"
                      }`}
                    >
                      {e.status || "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => openEdit(e)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon btn-action-delete"
                        onClick={() => handleDelete(e)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create Employee */}
      {showCreateModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Cấp quyền nhân sự cho tài khoản</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Chọn tài khoản người dùng (*):</label>
                  <select
                    className="admin-input"
                    value={createUserId}
                    onChange={(e) => setCreateUserId(Number(e.target.value))}
                    required
                  >
                    <option value="">-- Chọn tài khoản từ hệ thống --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.cardCode} - {u.email}) [{u.role}]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Chức vụ / Vị trí (*):</label>
                  <select
                    className="admin-input"
                    value={createPosition}
                    onChange={(e) => setCreatePosition(e.target.value)}
                  >
                    <option value="Thủ thư">Thủ thư</option>
                    <option value="Quản lý phòng">Quản lý phòng</option>
                    <option value="Chuyên viên">Chuyên viên</option>
                    <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang xử lý..." : "✓ Xác nhận cấp quyền"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Employee */}
      {editingEmp && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Chỉnh sửa nhân viên: {editingEmp.fullName}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingEmp(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Chức vụ:</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Đơn vị công tác:</label>
                  <select
                    className="admin-input"
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(Number(e.target.value))}
                  >
                    <option value="">-- Mặc định --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái công tác:</label>
                  <select
                    className="admin-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Active">Đang làm việc (Active)</option>
                    <option value="Inactive">Tạm nghỉ (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingEmp(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "✓ Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
