import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { PlusIcon, SearchIcon, AlertTriangleIcon } from "../Icon";

export interface RoomTypeItem {
  id: number;
  name: string;
  description: string;
  defaultCapacity: number;
  departmentId?: number;
  isBookingByPeriod: boolean;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminRoomTypesTab({ onNotify }: Props) {
  const [types, setTypes] = useState<RoomTypeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Create / Edit modal
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultCapacity: 10,
    isBookingByPeriod: false,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/RoomTypes");
      setTypes(res.data?.data || res.data || []);
    } catch (err: any) {
      console.error("Failed to load room types:", err);
      onNotify("Không thể tải danh sách loại phòng.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const filteredTypes = types.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      defaultCapacity: 10,
      isBookingByPeriod: false,
    });
  };

  const openEditModal = (item: RoomTypeItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      defaultCapacity: item.defaultCapacity,
      isBookingByPeriod: item.isBookingByPeriod,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên loại phòng.");
      return;
    }
    try {
      setSubmitting(true);
      if (modalMode === "create") {
        const res = await api.post("/api/RoomTypes", {
          name: formData.name.trim(),
          description: formData.description.trim(),
          defaultCapacity: Number(formData.defaultCapacity),
          isBookingByPeriod: Boolean(formData.isBookingByPeriod),
        });
        if (res.data?.success) {
          onNotify(`Đã thêm loại phòng "${formData.name}" thành công!`, "success");
        }
      } else if (modalMode === "edit" && editingId) {
        const res = await api.put(`/api/RoomTypes/${editingId}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          defaultCapacity: Number(formData.defaultCapacity),
          isBookingByPeriod: Boolean(formData.isBookingByPeriod),
        });
        if (res.data?.success) {
          onNotify(`Đã cập nhật loại phòng "${formData.name}" thành công!`, "success");
        }
      }
      setModalMode(null);
      await fetchTypes();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi xử lý loại phòng từ máy chủ.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: RoomTypeItem) => {
    if (
      !window.confirm(
        `Xác nhận xóa mềm loại phòng "${item.name}"?\n(Lưu ý: Không thể xóa nếu đang có phòng trực thuộc).`
      )
    )
      return;
    try {
      const res = await api.delete(`/api/RoomTypes/${item.id}`);
      if (res.data?.success) {
        onNotify(`Đã xóa loại phòng "${item.name}"!`, "info");
        await fetchTypes();
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi xóa loại phòng. Có thể đang có phòng thuộc loại này.",
        "warning"
      );
    }
  };

  return (
    <div className="admin-subtab-container">
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">🏷️ Quản lý danh mục loại phòng</h2>
          <p className="admin-subtab-subtitle">
            Cấu hình phân loại phòng (Phòng học lý thuyết, thực hành, hội trường, học nhóm) và quy cách mượn.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={fetchTypes}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "🔄 Làm mới"}
          </button>
          <button
            type="button"
            className="btn-toolbar-primary"
            onClick={openCreateModal}
          >
            <PlusIcon size={16} /> + Thêm loại phòng
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-box max-w-400">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo tên loại phòng, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh mục loại phòng...</p>
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy loại phòng</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên loại phòng</th>
                <th>Mô tả quy định</th>
                <th>Sức chứa chuẩn</th>
                <th>Hình thức mượn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTypes.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="code-tag">#{t.id}</span>
                  </td>
                  <td className="font-semibold text-highlight">{t.name}</td>
                  <td className="text-sm text-muted">{t.description || "—"}</td>
                  <td>
                    <strong>{t.defaultCapacity}</strong> người
                  </td>
                  <td>
                    {t.isBookingByPeriod ? (
                      <span className="badge-period">📅 Theo Tiết học cố định</span>
                    ) : (
                      <span className="badge-hour">⏰ Theo Khung giờ tự do</span>
                    )}
                  </td>
                  <td>
                    <div className="table-action-btns">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => openEditModal(t)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon btn-action-delete"
                        onClick={() => handleDelete(t)}
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

      {/* Modal */}
      {modalMode && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "create"
                  ? "+ Thêm loại phòng mới"
                  : `Chỉnh sửa loại phòng: ${formData.name}`}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalMode(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Tên loại phòng (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: Phòng thảo luận đồ án, Phòng multimedia..."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Sức chứa tiêu chuẩn (người):</label>
                  <input
                    type="number"
                    min={1}
                    className="admin-input"
                    value={formData.defaultCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultCapacity: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Hình thức đăng ký mượn:</label>
                  <div className="radio-pill-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="bookingMode"
                        checked={!formData.isBookingByPeriod}
                        onChange={() =>
                          setFormData({ ...formData, isBookingByPeriod: false })
                        }
                      />
                      <span>⏰ Theo khung giờ tự do (Khuyên dùng cho phòng Thư viện)</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="bookingMode"
                        checked={formData.isBookingByPeriod}
                        onChange={() =>
                          setFormData({ ...formData, isBookingByPeriod: true })
                        }
                      />
                      <span>📅 Theo tiết học cố định (Tiết 1-12)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group-admin">
                  <label>Mô tả công năng / Quy định mượn:</label>
                  <textarea
                    rows={3}
                    className="admin-textarea"
                    placeholder="Mục đích sử dụng, yêu cầu số lượng tối thiểu..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalMode(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "✓ Lưu loại phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
