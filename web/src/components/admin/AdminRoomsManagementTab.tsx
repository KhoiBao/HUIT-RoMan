import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import {
  DoorIcon,
  PlusIcon,
  SearchIcon,
  TvIcon,
  AlertTriangleIcon,
  WrenchIcon,
  CheckIcon,
  ClockIcon,
  RefreshCwIcon,
  XIcon,
} from "../Icon";
import AdminEquipmentsModal from "./AdminEquipmentsModal";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";

export interface RoomItem {
  id: number;
  name: string;
  roomCode: string;
  building: string;
  floor: string;
  roomNumber: string;
  capacity: number;
  status: string; // "Available", "InUse", "Maintenance"
  description: string;
  roomTypeId: number;
  roomTypeName: string;
  isBookingByPeriod: boolean;
}

export interface RoomTypeOption {
  id: number;
  name: string;
  defaultCapacity: number;
  isBookingByPeriod: boolean;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminRoomsManagementTab({ onNotify }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm } = useConfirm();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Equipment modal target
  const [equipmentTarget, setEquipmentTarget] = useState<RoomItem | null>(null);

  // Create / Edit modal state
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    roomCode: "",
    building: "A",
    floor: "Tầng 3",
    roomNumber: "101",
    capacity: 10,
    roomTypeId: 0,
    description: "",
    status: "Available",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch rooms and room types
  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, typesRes] = await Promise.all([
        api.get("/api/Rooms"),
        api.get("/api/RoomTypes"),
      ]);
      const rList = roomsRes.data?.data || roomsRes.data || [];
      const tList = typesRes.data?.data || typesRes.data || [];
      setRooms(rList);
      setRoomTypes(tList);
      if (tList.length > 0 && formData.roomTypeId === 0) {
        setFormData((prev) => ({ ...prev, roomTypeId: tList[0].id }));
      }
    } catch (err: any) {
      console.error("Failed to load rooms:", err);
      onNotify("Không thể tải danh sách phòng từ máy chủ.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (typeFilter !== "ALL" && String(r.roomTypeId) !== typeFilter)
        return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCode = r.roomCode.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesBuilding = (r.building || "").toLowerCase().includes(q);
        const matchesType = (r.roomTypeName || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesBuilding && !matchesType)
          return false;
      }
      return true;
    });
  }, [rooms, statusFilter, typeFilter, searchTerm]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode("create");
    setEditingRoomId(null);
    setFormData({
      name: "",
      roomCode: "",
      building: "A",
      floor: "Tầng 3",
      roomNumber: "",
      capacity: 10,
      roomTypeId: roomTypes[0]?.id || 0,
      description: "",
      status: "Available",
    });
  };

  // Open Edit Modal
  const openEditModal = (r: RoomItem) => {
    setModalMode("edit");
    setEditingRoomId(r.id);
    setFormData({
      name: r.name,
      roomCode: r.roomCode,
      building: r.building || "A",
      floor: r.floor || "",
      roomNumber: r.roomNumber || "",
      capacity: r.capacity || 10,
      roomTypeId: r.roomTypeId,
      description: r.description || "",
      status: r.status || "Available",
    });
  };

  // Save Room (Create or Update)
  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.roomCode.trim()) {
      alert("Vui lòng điền tên phòng và mã phòng.");
      return;
    }
    if (!formData.roomTypeId) {
      alert("Vui lòng chọn loại phòng.");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        const payload = {
          name: formData.name.trim(),
          roomCode: formData.roomCode.trim(),
          building: formData.building.trim(),
          floor: formData.floor.trim(),
          roomNumber: formData.roomNumber.trim(),
          capacity: Number(formData.capacity),
          description: formData.description.trim(),
          roomTypeId: Number(formData.roomTypeId),
        };
        const res = await api.post("/api/Rooms", payload);
        if (res.data?.success) {
          onNotify(`Đã tạo phòng ${formData.roomCode} thành công!`, "success");
        }
      } else if (modalMode === "edit" && editingRoomId) {
        const payload = {
          name: formData.name.trim(),
          roomCode: formData.roomCode.trim(),
          building: formData.building.trim(),
          floor: formData.floor.trim(),
          roomNumber: formData.roomNumber.trim(),
          capacity: Number(formData.capacity),
          status: formData.status,
          description: formData.description.trim(),
          roomTypeId: Number(formData.roomTypeId),
        };
        const res = await api.put(`/api/Rooms/${editingRoomId}`, payload);
        if (res.data?.success) {
          onNotify(`Đã cập nhật phòng ${formData.roomCode} thành công!`, "success");
        }
      }
      setModalMode(null);
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi xử lý phòng từ máy chủ.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Room Status: Available <=> Maintenance
  const handleToggleStatus = async (r: RoomItem) => {
    const nextStatus = r.status === "Maintenance" ? "Available" : "Maintenance";
    const statusLabel = nextStatus === "Maintenance" ? "Bảo trì" : "Sẵn sàng (Trống)";
    
    const isConfirmed = await confirm({
      title: "Chuyển trạng thái phòng",
      message: `Bạn có muốn chuyển trạng thái phòng ${r.roomCode} sang "${statusLabel}"?`,
      subMessage: nextStatus === "Maintenance"
        ? "Phòng bảo trì sẽ tạm thời ngừng phục vụ đặt phòng mới."
        : "Phòng sẽ sẵn sàng tiếp nhận đặt chỗ.",
      itemDetails: [
        { label: "Mã phòng", value: r.roomCode },
        { label: "Tên phòng", value: r.name },
        { label: "Khu vực", value: `Tòa ${r.building} - Tầng ${r.floor}` },
      ],
      confirmText: "Xác nhận chuyển",
      cancelText: "Hủy bỏ",
      type: nextStatus === "Maintenance" ? "warning" : "info",
    });

    if (!isConfirmed) return;

    try {
      await api.patch(`/api/Rooms/${r.id}/status`, { status: nextStatus });
      onNotify(`Đã cập nhật phòng ${r.roomCode} sang "${statusLabel}"!`, "success");
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi cập nhật trạng thái phòng.",
        "warning"
      );
    }
  };

  // Soft Delete Room
  const handleDeleteRoom = async (r: RoomItem) => {
    const isConfirmed = await confirm({
      title: "Cảnh báo xóa phòng học",
      message: `Bạn có chắc chắn muốn xóa phòng ${r.roomCode} (${r.name})?`,
      subMessage: "Phòng sẽ được xóa mềm khỏi hệ thống và không còn khả dụng cho các lượt đặt phòng.",
      itemDetails: [
        { label: "Mã phòng", value: r.roomCode },
        { label: "Tên phòng", value: r.name },
        { label: "Loại phòng", value: r.roomTypeName || "Phòng học", badge: `Sức chứa ${r.capacity}` },
      ],
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
      type: "danger",
    });

    if (!isConfirmed) return;

    try {
      const res = await api.delete(`/api/Rooms/${r.id}`);
      if (res.data?.success) {
        onNotify(`Đã xóa mềm phòng ${r.roomCode} thành công!`, "info");
        await fetchData();
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi xóa phòng từ máy chủ.",
        "warning"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return (
          <span className="admin-status-pill pill-approved">
            <CheckIcon size={12} className="mr-1 inline-block" /> Sẵn sàng (Trống)
          </span>
        );
      case "InUse":
        return (
          <span className="admin-status-pill pill-inuse">
            <ClockIcon size={12} className="mr-1 inline-block" /> Đang sử dụng
          </span>
        );
      case "Maintenance":
        return (
          <span className="admin-status-pill pill-maintenance">
            <WrenchIcon size={12} className="mr-1 inline-block" /> Đang bảo trì
          </span>
        );
      default:
        return <span className="admin-status-pill">{status}</span>;
    }
  };

  return (
    <div className="admin-subtab-container">
      {/* 1. Subtab Header */}
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <DoorIcon size={24} className="icon-blue-glow" /> Quản lý danh mục phòng học
          </h2>
          <p className="admin-subtab-subtitle">
            Cấu hình danh mục phòng học, hội trường, phòng nhóm và quản lý trạng thái vận hành.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCwIcon size={14} />
            <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={openCreateModal}
            >
              <PlusIcon size={16} /> + Thêm phòng mới
            </button>
          )}
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã phòng (A101...), Tên phòng, Tòa nhà..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
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
            <option value="ALL">-- Tất cả loại phòng --</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className="admin-select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Available">Sẵn sàng (Trống)</option>
            <option value="InUse">Đang sử dụng</option>
            <option value="Maintenance">Đang bảo trì</option>
          </select>
        </div>
      </div>

      {/* 3. Rooms Data Table */}
      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh sách phòng...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy phòng nào phù hợp</p>
          <p className="empty-desc">Thử tìm với từ khóa khác hoặc bấm "+ Thêm phòng mới".</p>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Mã phòng</th>
                <th>Tên phòng</th>
                <th>Loại phòng</th>
                <th>Vị trí</th>
                <th>Sức chứa</th>
                <th>Trạng thái</th>
                <th>Quy cách mượn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="room-code-badge-lg">{r.roomCode}</span>
                  </td>
                  <td className="font-semibold text-highlight">{r.name}</td>
                  <td>
                    <span className="tag-room-type">{r.roomTypeName}</span>
                  </td>
                  <td className="text-xs">
                    {r.building ? `Tòa ${r.building} - ` : ""}
                    {r.floor || "Khu học thuật"}
                  </td>
                  <td>
                    <strong>{r.capacity}</strong> người
                  </td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td>
                    <span className="text-xs text-muted">
                      {r.isBookingByPeriod ? "Theo Tiết học" : "Theo Giờ tự do"}
                    </span>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      {/* Equipment button */}
                      <button
                        type="button"
                        className="btn-action-icon btn-equip-glow"
                        title="Quản lý thiết bị trong phòng"
                        onClick={() => setEquipmentTarget(r)}
                      >
                        <TvIcon size={16} /> Thiết bị
                      </button>

                      {/* Status toggle */}
                      <button
                        type="button"
                        className={`btn-action-icon ${
                          r.status === "Maintenance"
                            ? "btn-status-restore"
                            : "btn-status-wrench"
                        }`}
                        title={
                          r.status === "Maintenance"
                            ? "Mở lại phòng (Sẵn sàng)"
                            : "Chuyển sang Bảo trì"
                        }
                        onClick={() => handleToggleStatus(r)}
                      >
                        <WrenchIcon size={14} />
                        {r.status === "Maintenance" ? "Mở phòng" : "Bảo trì"}
                      </button>

                      {/* Edit (Admin only) */}
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-action-icon"
                          title="Chỉnh sửa thông tin phòng"
                          onClick={() => openEditModal(r)}
                        >
                          Sửa
                        </button>
                      )}

                      {/* Delete (Admin only) */}
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn-action-icon btn-action-delete"
                          title="Xóa mềm phòng"
                          onClick={() => handleDeleteRoom(r)}
                        >
                          <XIcon size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Drawer / Modal */}
      {equipmentTarget && (
        <AdminEquipmentsModal
          room={equipmentTarget}
          onClose={() => setEquipmentTarget(null)}
          onNotify={onNotify}
        />
      )}

      {/* Create / Edit Room Modal */}
      {modalMode && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "create"
                  ? "+ Thêm phòng thư viện / giảng đường mới"
                  : `Chỉnh sửa phòng ${formData.roomCode}`}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalMode(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRoom}>
              <div className="modal-body">
                <div className="grid-2-col">
                  <div className="form-group-admin">
                    <label>Mã phòng (*):</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="VD: A105, B302..."
                      value={formData.roomCode}
                      onChange={(e) =>
                        setFormData({ ...formData, roomCode: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group-admin">
                    <label>Tên phòng (*):</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="VD: Phòng A105 (Tầng 3)..."
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="form-group-admin">
                    <label>Loại phòng (*):</label>
                    <select
                      className="admin-input"
                      value={formData.roomTypeId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          roomTypeId: Number(e.target.value),
                        })
                      }
                      required
                    >
                      {roomTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Sức chứa chuẩn: {t.defaultCapacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-admin">
                    <label>Sức chứa (người) (*):</label>
                    <input
                      type="number"
                      min={1}
                      className="admin-input"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid-3-col">
                  <div className="form-group-admin">
                    <label>Tòa nhà:</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="A, B, C, E..."
                      value={formData.building}
                      onChange={(e) =>
                        setFormData({ ...formData, building: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group-admin">
                    <label>Tầng lầu:</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="Tầng 1, Tầng 3..."
                      value={formData.floor}
                      onChange={(e) =>
                        setFormData({ ...formData, floor: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group-admin">
                    <label>Số phòng:</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="101, 202..."
                      value={formData.roomNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, roomNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                {modalMode === "edit" && (
                  <div className="form-group-admin">
                    <label>Trạng thái vận hành:</label>
                    <select
                      className="admin-input"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="Available">Sẵn sàng (Trống)</option>
                      <option value="InUse">Đang sử dụng</option>
                      <option value="Maintenance">Đang bảo trì</option>
                    </select>
                  </div>
                )}

                <div className="form-group-admin">
                  <label>Mô tả chi tiết / Ghi chú trang thiết bị:</label>
                  <textarea
                    rows={2}
                    className="admin-textarea"
                    placeholder="Mô tả công năng phòng, lưu ý ánh sáng, cách âm..."
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
                  className="btn-confirm-save flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting ? (
                    "Đang lưu..."
                  ) : modalMode === "create" ? (
                    <>
                      <CheckIcon size={15} />
                      <span>Thêm phòng</span>
                    </>
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
