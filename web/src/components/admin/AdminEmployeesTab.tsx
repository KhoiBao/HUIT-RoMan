import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import { formatRole } from "../../lib/auth";
import { useAuth } from "../../auth/AuthContext";
import {
  PlusIcon,
  SearchIcon,
  AlertTriangleIcon,
  BriefcaseIcon,
  RefreshCwIcon,
  XIcon,
  CheckIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import AdminPagination from "../common/AdminPagination";

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
  role?: string;
  departmentId?: number;
  departmentName?: string;
}

export interface DepartmentOption {
  id: number;
  name: string;
  type?: string;
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
  const { user } = useAuth();
  const { confirm, alert } = useConfirm();
  const normalizedRole = (user?.role || "").trim().toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "quan-tri" || normalizedRole === "quản trị viên";
  const isManager = normalizedRole === "manager" || normalizedRole === "quan-ly" || normalizedRole === "quản lý" || normalizedRole === "quản lý đơn vị" || normalizedRole === "departmentmanager";

  const userDeptIdStr = user?.departmentId ? String(user.departmentId) : "";
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>(!isAdmin && userDeptIdStr ? userDeptIdStr : "ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "dept">("name_asc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    if (!isAdmin && userDeptIdStr) {
      setDeptFilter(userDeptIdStr);
    }
  }, [isAdmin, userDeptIdStr]);

  // Modal create
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createUserId, setCreateUserId] = useState<number | "">("");
  const [createPosition, setCreatePosition] = useState<string>("Thủ thư");
  const [createRole, setCreateRole] = useState<string>("Employee");
  const [createDeptId, setCreateDeptId] = useState<number | "">("");

  // Modal edit
  const [editingEmp, setEditingEmp] = useState<EmployeeItem | null>(null);
  const [editPosition, setEditPosition] = useState<string>("");
  const [editRole, setEditRole] = useState<string>("Employee");
  const [editStatus, setEditStatus] = useState<string>("Hoạt động");
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

  const filteredEmployees = useMemo(() => {
    const list = employees.filter((e) => {
      // Nếu không phải Admin, chỉ hiển thị nhân sự thuộc đúng đơn vị của mình
      if (!isAdmin) {
        if (userDeptIdStr && String(e.departmentId) !== userDeptIdStr) return false;
        if (!userDeptIdStr && user?.departmentName && e.departmentName !== user.departmentName) return false;
      } else {
        if (deptFilter !== "ALL" && String(e.departmentId) !== deptFilter) return false;
      }

      if (roleFilter !== "ALL" && e.role !== roleFilter) return false;
      if (statusFilter !== "ALL") {
        const isWorking =
          e.status === "Active" ||
          e.status === "Hoạt động" ||
          e.status === "Đang làm việc" ||
          !e.status;
        if (statusFilter === "active" && !isWorking) return false;
        if (statusFilter === "inactive" && isWorking) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = (e.code || "").toLowerCase().includes(q);
        const matchName = (e.fullName || "").toLowerCase().includes(q) || (e.userName || "").toLowerCase().includes(q);
        const matchEmail = (e.email || "").toLowerCase().includes(q);
        const matchPos = (e.position || "").toLowerCase().includes(q);
        const matchRole = (formatRole(e.role) || "").toLowerCase().includes(q);
        const matchDept = (e.departmentName || "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchEmail && !matchPos && !matchRole && !matchDept) {
          return false;
        }
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "name_desc") {
        return (b.fullName || b.userName).localeCompare(a.fullName || a.userName);
      }
      if (sortBy === "dept") {
        return (a.departmentName || "").localeCompare(b.departmentName || "");
      }
      // default: name_asc (A-Z)
      return (a.fullName || a.userName).localeCompare(b.fullName || b.userName);
    });
  }, [employees, isAdmin, userDeptIdStr, user?.departmentName, deptFilter, roleFilter, statusFilter, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedEmployees = filteredEmployees.slice(pageStart, pageStart + pageSize);

  const resetAllFilters = () => {
    setSearchTerm("");
    if (isAdmin) setDeptFilter("ALL");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("name_asc");
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    (isAdmin && deptFilter !== "ALL") ||
    roleFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    sortBy !== "name_asc";

  // Open Create Modal
  const openCreate = () => {
    setCreateUserId("");
    setCreatePosition("Thủ thư");
    setCreateRole("Employee");
    setCreateDeptId((user?.role === "Employee" || user?.role === "Manager") && user?.departmentId ? user.departmentId : "");
    setShowCreateModal(true);
  };

  // Handle Create Employee
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserId) {
      await alert({
        title: "Chưa chọn người dùng",
        message: "Vui lòng chọn một người dùng từ danh sách để cấp quyền nhân sự.",
        type: "warning",
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post("/api/Employees", {
        userId: Number(createUserId),
        position: createPosition.trim(),
        role: createRole,
        departmentId: createDeptId ? Number(createDeptId) : null,
      });
      if (res.data?.success) {
        onNotify("Đã tạo hồ sơ nhân viên thành công!", "success");
        setShowCreateModal(false);
        setCreateUserId("");
        setCreateDeptId("");
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
    setEditRole(emp.role || "Employee");
    setEditStatus(emp.status === "Active" ? "Hoạt động" : emp.status || "Hoạt động");
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
        role: editRole,
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
    const isConfirmed = await confirm({
      title: "Xác nhận xóa hồ sơ nhân sự",
      message: `Bạn có chắc chắn muốn xóa hồ sơ nhân sự của "${emp.fullName || emp.userName}" (${emp.code || `#${emp.id}`})?`,
      subMessage: "Vai trò Nhân sự / Quản lý của tài khoản này sẽ được thu hồi. Tài khoản sẽ quay về quyền người dùng thông thường.",
      itemDetails: [
        { label: "Mã nhân sự", value: emp.code || `#${emp.id}` },
        { label: "Họ và tên", value: emp.fullName || emp.userName },
        { label: "Chức vụ", value: emp.position || "Thủ thư", badge: emp.departmentName || "Thư viện HUIT" },
        { label: "Vai trò", value: formatRole(emp.role) },
        { label: "Email liên hệ", value: emp.email },
      ],
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
      type: "danger",
    });

    if (!isConfirmed) return;

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
          <h2 className="admin-subtab-title">
            <BriefcaseIcon size={24} className="icon-blue-glow" /> Quản lý danh mục nhân viên &amp; Thủ thư
          </h2>
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
            <RefreshCwIcon size={14} />
            <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
          </button>
          <button
            type="button"
            className="btn-toolbar-primary"
            onClick={openCreate}
          >
            <PlusIcon size={16} /> + Thêm nhân sự mới
          </button>
        </div>
      </div>

      <div className="admin-filter-bar flex-wrap align-center gap-2">
        <div className="admin-search-box max-w-350">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã nhân viên, Họ tên, Email, Chức vụ..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {departments.length > 0 && (
          <select
            className="admin-select-filter"
            value={deptFilter}
            onChange={(e) => {
              if (isAdmin) {
                setDeptFilter(e.target.value);
                setPage(1);
              }
            }}
            disabled={!isAdmin}
            style={!isAdmin ? { backgroundColor: "#f8fafc", cursor: "not-allowed", color: "#475569" } : {}}
            title={!isAdmin ? `Đơn vị của bạn: ${user?.departmentName || "Được phân công"} (chỉ quản trị viên mới có thể chuyển đơn vị)` : "Lọc theo Đơn vị công tác"}
          >
            {isAdmin && <option value="ALL">-- Tất cả đơn vị --</option>}
            {departments
              .filter((d) => isAdmin || String(d.id) === userDeptIdStr || d.name === user?.departmentName)
              .map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} {!isAdmin ? "(Đơn vị của bạn)" : ""}
                </option>
              ))}
          </select>
        )}

        <select
          className="admin-select-filter"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          title="Lọc theo Vai trò phân quyền"
        >
          <option value="ALL">-- Tất cả vai trò --</option>
          <option value="Employee">Thủ thư / Nhân viên trực</option>
          <option value="Manager">Quản lý đơn vị</option>
          <option value="Admin">Quản trị viên hệ thống</option>
        </select>

        <select
          className="admin-select-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          title="Lọc theo Trạng thái công tác"
        >
          <option value="ALL">-- Tất cả trạng thái --</option>
          <option value="active">Đang làm việc</option>
          <option value="inactive">Tạm nghỉ / Đã nghỉ</option>
        </select>

        <select
          className="admin-select-filter"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as any);
            setPage(1);
          }}
          title="Sắp xếp danh sách nhân sự"
        >
          <option value="name_asc">Họ tên A-Z</option>
          <option value="name_desc">Họ tên Z-A</option>
          <option value="dept">Đơn vị công tác</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn-table-action"
            onClick={resetAllFilters}
            title="Xóa tất cả bộ lọc về mặc định"
            style={{
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              borderColor: "#fecaca",
              height: "38px",
              padding: "0 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
            }}
          >
            <XIcon size={13} />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {(user?.role === "Employee" || user?.role === "Manager") && (
        <div style={{
          backgroundColor: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e40af",
          padding: "10px 14px",
          borderRadius: "8px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "13.5px"
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <BriefcaseIcon size={16} /> Bạn đang quản lý danh sách nhân sự thuộc đơn vị: <strong>{user?.departmentName || "Đơn vị được phân công"}</strong>
          </span>
          <span style={{
            backgroundColor: "#dbeafe",
            padding: "2px 8px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "12px"
          }}>
            {filteredEmployees.length} nhân sự
          </span>
        </div>
      )}

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
        <>
          <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Chức vụ / Vị trí</th>
                <th>Vai trò phân quyền</th>
                <th>Email liên hệ</th>
                <th>Đơn vị công tác</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedEmployees.map((e) => (
                <tr
                  key={e.id}
                  className="admin-clickable-row"
                  onClick={() => openEdit(e)}
                  title="Bấm vào dòng để chỉnh sửa thông tin nhân viên"
                >
                  <td>
                    <span className="code-tag">{e.code || `#${e.id}`}</span>
                  </td>
                  <td className="font-semibold text-highlight">{e.fullName || e.userName}</td>
                  <td>
                    <span className="badge-position">{e.position || "Thủ thư"}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor:
                          e.role === "Admin"
                            ? "#f3e8ff"
                            : e.role === "Manager"
                            ? "#fef3c7"
                            : "#eff6ff",
                        color:
                          e.role === "Admin"
                            ? "#6b21a8"
                            : e.role === "Manager"
                            ? "#92400e"
                            : "#1e40af",
                        border: `1px solid ${
                          e.role === "Admin"
                            ? "#d8b4fe"
                            : e.role === "Manager"
                            ? "#fde68a"
                            : "#bfdbfe"
                        }`,
                      }}
                    >
                      {formatRole(e.role || "Employee")}
                    </span>
                  </td>
                  <td className="text-xs text-muted">{e.email}</td>
                  <td>{e.departmentName || "Thư viện HUIT"}</td>
                  <td>
                    {(() => {
                      const isWorking =
                        e.status === "Active" ||
                        e.status === "Hoạt động" ||
                        e.status === "Đang làm việc" ||
                        !e.status;
                      return (
                        <span
                          className={`admin-status-pill flex items-center gap-1 ${
                            isWorking ? "pill-approved" : "pill-rejected"
                          }`}
                        >
                          <CheckIcon size={12} />
                          <span>{isWorking ? "Đang làm việc" : "Tạm nghỉ"}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
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
                        <XIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          <AdminPagination
            currentPage={currentPage}
            totalItems={filteredEmployees.length}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(sz) => setPageSize(sz)}
            itemLabel="nhân sự"
          />
        </>
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
                <XIcon size={16} />
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
                        {u.fullName} ({u.cardCode} - {u.email}) [{formatRole(u.role)}]
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
                    <option value="Quản lý đơn vị">Quản lý đơn vị</option>
                    <option value="Chuyên viên">Chuyên viên</option>
                    <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Vai trò hệ thống / Quyền hạn (*):</label>
                  <select
                    className="admin-input"
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    required
                  >
                    <option value="Employee">Nhân viên (Thủ thư / Nhân viên trực)</option>
                    <option value="Manager">Quản lý đơn vị (Phân công ca trực, duyệt phòng)</option>
                    {isAdmin && <option value="Admin">Quản trị viên toàn trường</option>}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Đơn vị / Phòng ban tương ứng (*):</label>
                  <select
                    className="admin-input"
                    value={createDeptId}
                    onChange={(e) => setCreateDeptId(e.target.value ? Number(e.target.value) : "")}
                    disabled={(user?.role === "Employee" || user?.role === "Manager") && !!user?.departmentId}
                    required
                  >
                    <option value="">-- Chọn đơn vị tương ứng --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.type ? `(${d.type})` : ""}
                      </option>
                    ))}
                  </select>
                  {(user?.role === "Employee" || user?.role === "Manager") && user?.departmentId && (
                    <small style={{ color: "#64748b", fontSize: "12px", display: "block", marginTop: "4px" }}>
                      Tự động gán theo đơn vị của bạn: {user.departmentName || "Đơn vị hiện tại"}
                    </small>
                  )}
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
                  className="btn-confirm-save flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <CheckIcon size={15} />
                      <span>Xác nhận cấp quyền</span>
                    </>
                  )}
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
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Chức vụ / Vị trí (*):</label>
                  <select
                    className="admin-input"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                  >
                    <option value="Thủ thư">Thủ thư</option>
                    <option value="Quản lý phòng">Quản lý phòng</option>
                    <option value="Quản lý đơn vị">Quản lý đơn vị</option>
                    <option value="Chuyên viên">Chuyên viên</option>
                    <option value="Kỹ thuật viên">Kỹ thuật viên</option>
                    {!["Thủ thư", "Quản lý phòng", "Quản lý đơn vị", "Chuyên viên", "Kỹ thuật viên"].includes(editPosition) && editPosition && (
                      <option value={editPosition}>{editPosition}</option>
                    )}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Vai trò hệ thống / Quyền hạn (*):</label>
                  <select
                    className="admin-input"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={!isAdmin && !isManager}
                  >
                    <option value="Employee">Nhân viên (Thủ thư / Nhân viên trực)</option>
                    <option value="Manager">Quản lý đơn vị (Phân công ca trực, duyệt phòng)</option>
                    {isAdmin && <option value="Admin">Quản trị viên toàn trường</option>}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Đơn vị công tác:</label>
                  <select
                    className="admin-input"
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(Number(e.target.value))}
                    disabled={!isAdmin && isManager}
                  >
                    <option value="">-- Mặc định --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {!isAdmin && isManager && (
                    <small style={{ color: "#64748b", fontSize: "12px", display: "block", marginTop: "4px" }}>
                      Quản lý đơn vị chỉ quản lý nhân sự thuộc đơn vị của mình.
                    </small>
                  )}
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái công tác:</label>
                  <select
                    className="admin-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Hoạt động">Đang làm việc</option>
                    <option value="Không hoạt động">Tạm nghỉ</option>
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
