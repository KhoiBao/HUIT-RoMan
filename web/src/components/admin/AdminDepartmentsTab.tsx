import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import {
  BankIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  UsersIcon,
  DoorIcon,
} from "../Icon";

export interface DepartmentItem {
  id: number;
  name: string;
  type?: string;
  status: string;
  totalEmployees: number;
  totalRoomTypes: number;
  totalRooms: number;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

const DEPARTMENT_TYPES = [
  { value: "Management", label: "Ban giám hiệu / Quản lý chung" },
  { value: "Office", label: "Phòng ban chức năng" },
  { value: "Library", label: "Thư viện" },
  { value: "Faculty", label: "Khoa / Viện đào tạo" },
  { value: "Center", label: "Trung tâm trực thuộc" },
];

const normalizeStatus = (status?: string): string => {
  if (!status) return "Hoạt động";
  const s = status.trim().toLowerCase();
  if (s === "active" || s === "hoạt động") return "Hoạt động";
  if (s === "inactive" || s === "tạm khóa" || s === "ngưng hoạt động") return "Tạm khóa";
  return status;
};

export default function AdminDepartmentsTab({ onNotify }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal Create
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createType, setCreateType] = useState<string>("Office");
  const [createStatus, setCreateStatus] = useState<string>("Hoạt động");

  // Modal Edit
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editType, setEditType] = useState<string>("Office");
  const [editStatus, setEditStatus] = useState<string>("Hoạt động");

  // Modal Delete
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/Departments");
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map((d: any) => ({
        ...d,
        status: normalizeStatus(d.status),
      }));
      setDepartments(normalized);
    } catch (err: any) {
      console.error("Failed to load departments:", err);
      onNotify("Không thể tải danh sách đơn vị.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.type || "").toLowerCase().includes(q) ||
        d.id.toString().includes(q);

      const matchType =
        typeFilter === "ALL" || (d.type || "").toLowerCase() === typeFilter.toLowerCase();

      const dStatus = normalizeStatus(d.status);
      const matchStatus =
        statusFilter === "ALL" || dStatus === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [departments, searchTerm, typeFilter, statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => normalizeStatus(d.status) === "Hoạt động").length;
    const inactive = total - active;
    const totalEmps = departments.reduce((acc, d) => acc + (d.totalEmployees || 0), 0);
    const totalRooms = departments.reduce((acc, d) => acc + (d.totalRooms || 0), 0);
    return { total, active, inactive, totalEmps, totalRooms };
  }, [departments]);

  // Open Create Modal
  const openCreate = () => {
    setCreateName("");
    setCreateType("Office");
    setCreateStatus("Hoạt động");
    setShowCreateModal(true);
  };

  // Handle Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      alert("Vui lòng nhập tên đơn vị.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/api/Departments", {
        name: createName.trim(),
        type: createType,
        status: createStatus,
      });

      if (res.data?.success || res.status === 201 || res.status === 200) {
        onNotify("Thêm mới đơn vị thành công!", "success");
        setShowCreateModal(false);
        setCreateName("");
        await fetchDepartments();
      } else {
        onNotify(res.data?.message || "Không thể tạo đơn vị.", "warning");
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi tạo đơn vị mới.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setEditName(dept.name);
    setEditType(dept.type || "Office");
    setEditStatus(normalizeStatus(dept.status));
  };

  // Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!editName.trim()) {
      alert("Tên đơn vị không được để trống.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/api/Departments/${editingDept.id}`, {
        name: editName.trim(),
        type: editType,
        status: editStatus,
      });

      if (res.data?.success || res.status === 200) {
        onNotify("Cập nhật đơn vị thành công!", "success");
        setEditingDept(null);
        await fetchDepartments();
      } else {
        onNotify(res.data?.message || "Không thể cập nhật đơn vị.", "warning");
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi cập nhật đơn vị.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deletingDept) return;
    try {
      setSubmitting(true);
      const res = await api.delete(`/api/Departments/${deletingDept.id}`);
      if (res.data?.success || res.status === 200) {
        onNotify(`Đã xóa đơn vị "${deletingDept.name}" thành công!`, "success");
        setDeletingDept(null);
        await fetchDepartments();
      } else {
        onNotify(res.data?.message || "Không thể xóa đơn vị.", "warning");
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi xóa đơn vị. Đơn vị có thể đang có nhân sự hoặc phòng liên kết.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type?: string) => {
    const item = DEPARTMENT_TYPES.find(
      (t) => t.value.toLowerCase() === (type || "").toLowerCase()
    );
    return item ? item.label : type || "Chưa phân loại";
  };

  return (
    <div className="admin-subtab-container">
      {/* ── Subtab Header ─────────────────────────────────────────────── */}
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <BankIcon size={24} className="icon-blue-glow" /> Quản lý danh mục đơn vị &amp; Phòng ban
          </h2>
          <p className="admin-subtab-subtitle">
            Quản trị cơ cấu tổ chức, phân cấp quyền hạn quản lý phòng và nhân sự theo từng đơn vị trường HUIT.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={fetchDepartments}
            disabled={loading}
          >
            <RefreshCwIcon size={14} />
            <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={openCreate}
            >
              <PlusIcon size={16} /> + Thêm đơn vị mới
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Cards Strip ──────────────────────────────────────────── */}
      <div className="admin-stat-row">
        <div className="admin-stat-card">
          <span className="stat-label">Tổng số đơn vị</span>
          <span className="stat-val">{stats.total}</span>
        </div>

        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Hoạt động" ? "stat-active" : ""
          }`}
          onClick={() => setStatusFilter(statusFilter === "Hoạt động" ? "ALL" : "Hoạt động")}
          title="Bấm để lọc đơn vị đang hoạt động"
        >
          <span className="stat-label color-green">
            <CheckIcon size={12} className="mr-1 inline-block" /> Đang hoạt động
          </span>
          <span className="stat-val color-green">{stats.active}</span>
        </div>

        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Tạm khóa" ? "stat-active" : ""
          }`}
          onClick={() => setStatusFilter(statusFilter === "Tạm khóa" ? "ALL" : "Tạm khóa")}
          title="Bấm để lọc đơn vị đang tạm khóa"
        >
          <span className="stat-label color-amber">
            <AlertTriangleIcon size={12} className="mr-1 inline-block" /> Tạm khóa
          </span>
          <span className="stat-val color-amber">{stats.inactive}</span>
        </div>

        <div className="admin-stat-card">
          <span className="stat-label">Nhân sự &amp; Phòng học</span>
          <span className="stat-val text-indigo-600">
            {stats.totalEmps}{" "}
            <span className="text-sm font-normal text-slate-500">
              nhân sự / {stats.totalRooms} phòng
            </span>
          </span>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="admin-filter-bar">
        <div className="admin-search-box max-w-400">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo tên đơn vị, phân loại, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
              title="Xóa tìm kiếm"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        <div className="admin-select-filters">
          <select
            className="admin-select-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Tất cả phân loại đơn vị</option>
            {DEPARTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-status-filters">
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "ALL" ? "active-pill" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            Tất cả ({departments.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "Hoạt động" ? "active-pill" : ""}`}
            onClick={() => setStatusFilter("Hoạt động")}
          >
            Hoạt động ({stats.active})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "Tạm khóa" ? "active-pill" : ""}`}
            onClick={() => setStatusFilter("Tạm khóa")}
          >
            Tạm khóa ({stats.inactive})
          </button>
        </div>
      </div>

      {/* ── Table / Content ───────────────────────────────────────────── */}
      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh sách đơn vị...</p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy đơn vị nào</p>
          <p className="empty-desc">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>ID</th>
                <th>Tên đơn vị / Phòng ban</th>
                <th>Phân loại</th>
                <th>Nhân sự trực thuộc</th>
                <th>Phòng quản lý</th>
                <th>Trạng thái</th>
                {isAdmin && <th style={{ textAlign: "right", width: "120px" }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((dept) => {
                const isAct = normalizeStatus(dept.status) === "Hoạt động";
                return (
                  <tr key={dept.id}>
                    <td>
                      <span className="code-tag">#{dept.id}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <BankIcon size={16} className="text-slate-400" />
                        <span className="font-semibold text-highlight">{dept.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="tag-room-type">{getTypeLabel(dept.type)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <UsersIcon size={14} className="text-blue-500" />
                        <span className="badge-count-pill">{dept.totalEmployees} nhân sự</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
                        <DoorIcon size={14} className="text-amber-500" />
                        <span>
                          <strong>{dept.totalRoomTypes}</strong> loại • <strong>{dept.totalRooms}</strong> phòng
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`admin-status-pill flex items-center gap-1 ${
                          isAct ? "pill-approved" : "pill-maintenance"
                        }`}
                      >
                        {isAct ? <CheckIcon size={12} /> : <AlertTriangleIcon size={12} />}
                        <span>{isAct ? "Hoạt động" : "Tạm khóa"}</span>
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="table-action-btns" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn-action-icon"
                            onClick={() => openEdit(dept)}
                            title="Chỉnh sửa đơn vị"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn-action-icon btn-action-delete"
                            onClick={() => setDeletingDept(dept)}
                            title="Xóa đơn vị"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Create Department ───────────────────────────────────── */}
      {showCreateModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <PlusIcon size={18} className="icon-blue-glow" /> Thêm đơn vị / Phòng ban mới
              </h3>
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
                  <label>Tên đơn vị / Phòng ban (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: Khoa Ngoại ngữ, Trung tâm Tin học..."
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Phân loại đơn vị (*):</label>
                  <select
                    className="admin-input"
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                  >
                    {DEPARTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái hoạt động (*):</label>
                  <select
                    className="admin-input"
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value)}
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Tạm khóa">Tạm khóa</option>
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
                  className="btn-confirm-save flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    "Đang lưu..."
                  ) : (
                    <>
                      <CheckIcon size={15} />
                      <span>Xác nhận thêm</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Edit Department ─────────────────────────────────────── */}
      {editingDept && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <BankIcon size={18} className="icon-blue-glow" /> Chỉnh sửa đơn vị: {editingDept.name}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingDept(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Tên đơn vị / Phòng ban (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Phân loại đơn vị (*):</label>
                  <select
                    className="admin-input"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                  >
                    {DEPARTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái hoạt động (*):</label>
                  <select
                    className="admin-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Tạm khóa">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingDept(null)}
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

      {/* ── Modal Confirm Delete ──────────────────────────────────────── */}
      {deletingDept && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title color-red flex items-center gap-2">
                <AlertTriangleIcon size={18} /> Xác nhận xóa đơn vị
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeletingDept(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: "0 0 12px 0", color: "#334155", fontSize: "14px" }}>
                Bạn có chắc chắn muốn xóa đơn vị <strong>"{deletingDept.name}"</strong>?
              </p>

              {(deletingDept.totalEmployees > 0 || deletingDept.totalRooms > 0) && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                >
                  ⚠️ <strong>Cảnh báo ràng buộc:</strong> Đơn vị này hiện đang có{" "}
                  <strong>{deletingDept.totalEmployees} nhân sự</strong> và{" "}
                  <strong>{deletingDept.totalRooms} phòng học</strong> trực thuộc. Hệ thống sẽ từ chối xóa nếu các liên kết này chưa được giải phóng.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeletingDept(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-action-icon btn-action-delete"
                style={{ padding: "8px 16px", fontWeight: 700 }}
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
