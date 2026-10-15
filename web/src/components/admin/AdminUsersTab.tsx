import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import {
  SearchIcon,
  AlertTriangleIcon,
  LockIcon,
  GraduationCapIcon,
  UsersIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
} from "../Icon";

export interface UserItem {
  id: number;
  userName: string;
  cardCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  status: string;
  departmentId?: number;
  departmentName?: string;
  role: string;
  createdAt: string;
  isEmployee: boolean;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminUsersTab({ onNotify }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userType, setUserType] = useState<"students" | "lecturers" | "all">("students");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("Hoạt động");
  const [editRole, setEditRole] = useState<string>("Student");

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = "/api/Users/students";
      if (userType === "lecturers") endpoint = "/api/Users/lecturers";
      if (userType === "all") endpoint = "/api/Users";

      const res = await api.get(endpoint);
      setUsers(res.data?.data || res.data || []);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      onNotify("Không thể tải danh sách người dùng.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userType]);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      (u.cardCode || "").toLowerCase().includes(q) ||
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phoneNumber || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditFullName(u.fullName || "");
    setEditEmail(u.email || "");
    setEditPhone(u.phoneNumber || "");
    setEditStatus(u.status === "Active" ? "Hoạt động" : u.status || "Hoạt động");
    setEditRole(u.role || "Student");
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSubmitting(true);
      // 1. Update basic info
      await api.put(`/api/Users/${editingUser.id}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phoneNumber: editPhone.trim(),
        status: editStatus,
        departmentId: editingUser.departmentId,
      });

      // 2. If role changed, update role
      if (editRole !== editingUser.role) {
        await api.patch(`/api/Users/${editingUser.id}/role`, {
          role: editRole,
        });
      }

      // 3. If status changed, update status
      if (editStatus !== editingUser.status) {
        await api.patch(`/api/Users/${editingUser.id}/status?status=${editStatus}`);
      }

      onNotify(`Đã cập nhật thông tin người dùng ${editFullName}!`, "success");
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi lưu thông tin người dùng.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle account lock
  const handleToggleLock = async (u: UserItem) => {
    const isLocked =
      u.status === "Đình chỉ" ||
      u.status === "Không hoạt động" ||
      u.status === "Suspended" ||
      u.status === "Inactive" ||
      u.status === "Khóa";
    const nextStatus = isLocked ? "Hoạt động" : "Đình chỉ";
    const actionName = isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản";

    if (
      !window.confirm(
        `Xác nhận ${actionName} của "${u.fullName}" (${u.cardCode})?\n${
          !isLocked ? "Người dùng này sẽ bị chặn đăng nhập ngay lập tức." : ""
        }`
      )
    )
      return;

    try {
      await api.patch(`/api/Users/${u.id}/status?status=${nextStatus}`);
      onNotify(`Đã ${actionName.toLowerCase()} thành công!`, "info");
      await fetchUsers();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi cập nhật trạng thái tài khoản.",
        "warning"
      );
    }
  };

  const formatRole = (role?: string) => {
    switch (role) {
      case "Student":
        return "Sinh viên";
      case "Lecturer":
        return "Giảng viên";
      case "Employee":
        return "Nhân viên / Thủ thư";
      case "Admin":
        return "Quản trị viên";
      default:
        return role || "Người dùng";
    }
  };

  return (
    <div className="admin-subtab-container">
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title flex items-center gap-2">
            <GraduationCapIcon size={24} className="icon-blue-glow inline-block" />
            <span>Quản lý Sinh viên &amp; Giảng viên</span>
          </h2>
          <p className="admin-subtab-subtitle">
            Tra cứu tài khoản người dùng, quản lý quyền hạn và điều phối trạng thái truy cập hệ thống.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-refresh flex items-center gap-1.5"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCwIcon size={14} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
        </button>
      </div>

      {/* Switch between Sinh viên vs Giảng viên vs Tất cả */}
      <div className="admin-filter-bar">
        <div className="admin-status-filters">
          <button
            type="button"
            className={`filter-pill-btn flex items-center gap-1.5 ${
              userType === "students" ? "active-pill" : ""
            }`}
            onClick={() => setUserType("students")}
          >
            <GraduationCapIcon size={15} />
            <span>Danh sách Sinh viên</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn flex items-center gap-1.5 ${
              userType === "lecturers" ? "active-pill" : ""
            }`}
            onClick={() => setUserType("lecturers")}
          >
            <UsersIcon size={15} />
            <span>Danh sách Giảng viên</span>
          </button>
          <button
            type="button"
            className={`filter-pill-btn flex items-center gap-1.5 ${
              userType === "all" ? "active-pill" : ""
            }`}
            onClick={() => setUserType("all")}
          >
            <UsersIcon size={15} />
            <span>Tất cả người dùng</span>
          </button>
        </div>

        <div className="admin-search-box max-w-400">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo MSSV / Mã thẻ, Họ tên, Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh sách người dùng...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy người dùng nào</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Mã thẻ / MSSV</th>
                <th>Họ và tên</th>
                <th>Email HUIT</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isLocked =
                  u.status === "Suspended" ||
                  u.status === "Inactive" ||
                  u.status === "Khóa" ||
                  u.status === "Đã khóa" ||
                  u.status === "Ngừng kích hoạt";

                return (
                  <tr key={u.id}>
                    <td>
                      <span className="code-tag">{u.cardCode || u.userName}</span>
                    </td>
                    <td className="font-semibold text-highlight">{u.fullName}</td>
                    <td className="text-xs text-muted">{u.email}</td>
                    <td className="text-xs">{u.phoneNumber || "—"}</td>
                    <td>
                      <span className="tag-role-pill">{formatRole(u.role)}</span>
                    </td>
                    <td>
                      <span
                        className={`admin-status-pill flex items-center gap-1 ${
                          isLocked ? "pill-rejected" : "pill-approved"
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <LockIcon size={12} />
                            <span>Đã khóa</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon size={12} />
                            <span>Hoạt động</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="table-action-btns">
                        <button
                          type="button"
                          className="btn-action-icon"
                          onClick={() => openEdit(u)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`btn-action-icon ${
                            isLocked ? "btn-status-restore" : "btn-action-delete"
                          }`}
                          title={isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          onClick={() => handleToggleLock(u)}
                        >
                          <LockIcon size={14} />
                          {isLocked ? "Mở khóa" : "Khóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Chỉnh sửa tài khoản: {editingUser.fullName}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingUser(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Mã thẻ / MSSV (Cố định):</label>
                  <input
                    type="text"
                    className="admin-input bg-gray-50"
                    value={editingUser.cardCode}
                    disabled
                  />
                </div>

                <div className="form-group-admin">
                  <label>Họ và tên:</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Email liên hệ:</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Số điện thoại:</label>
                  <input
                    type="tel"
                    className="admin-input"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="grid-2-col">
                  <div className="form-group-admin">
                    <label>Vai trò hệ thống:</label>
                    <select
                      className="admin-input"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="Student">Sinh viên</option>
                      <option value="Lecturer">Giảng viên</option>
                      <option value="Employee">Nhân viên / Thủ thư</option>
                      <option value="Admin">Quản trị viên</option>
                    </select>
                  </div>

                  <div className="form-group-admin">
                    <label>Trạng thái tài khoản:</label>
                    <select
                      className="admin-input"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Hoạt động">Hoạt động</option>
                      <option value="Đình chỉ">Khóa tài khoản</option>
                      <option value="Không hoạt động">Ngừng kích hoạt</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingUser(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    "Đang lưu..."
                  ) : (
                    <>
                      <CheckIcon size={15} />
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
