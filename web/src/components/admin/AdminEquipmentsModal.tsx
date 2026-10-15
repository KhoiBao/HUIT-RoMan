import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { TvIcon, PlusIcon, AlertTriangleIcon } from "../Icon";

export interface RoomEquipmentItem {
  roomId: number;
  roomName: string;
  equipmentId: number;
  equipmentName: string;
  quantity: number;
  status: string;
}

export interface WarehouseEquipment {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  equipmentCategoryId: number;
}

export interface EquipmentCategory {
  id: number;
  name: string;
  description: string;
}

interface Props {
  room: {
    id: number;
    roomCode: string;
    name: string;
  };
  onClose: () => void;
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminEquipmentsModal({ room, onClose, onNotify }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"room" | "warehouse">("room");
  const [roomEquipments, setRoomEquipments] = useState<RoomEquipmentItem[]>([]);
  const [warehouseEquipments, setWarehouseEquipments] = useState<WarehouseEquipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add equipment to room form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedEquipId, setSelectedEquipId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(1);
  const [equipStatus, setEquipStatus] = useState<string>("Hoạt động tốt");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Add new equipment to warehouse form
  const [newEquipCode, setNewEquipCode] = useState<string>("");
  const [newEquipName, setNewEquipName] = useState<string>("");
  const [newEquipDesc, setNewEquipDesc] = useState<string>("");
  const [newEquipCatId, setNewEquipCatId] = useState<number | "">("");

  // Fetch room equipments
  const fetchRoomEquipments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/Rooms/${room.id}/equipments`);
      setRoomEquipments(res.data?.data || res.data || []);
    } catch (err: any) {
      console.error("Failed to load room equipments:", err);
      onNotify("Không thể tải danh sách thiết bị của phòng.", "warning");
    } finally {
      setLoading(false);
    }
  };

  // Fetch warehouse equipment and categories
  const fetchWarehouseData = async () => {
    try {
      const [equipRes, catRes] = await Promise.all([
        api.get("/api/Equipments"),
        api.get("/api/EquipmentCategories"),
      ]);
      setWarehouseEquipments(equipRes.data?.data || equipRes.data || []);
      const cats = catRes.data?.data || catRes.data || [];
      setCategories(cats);
      if (cats.length > 0 && newEquipCatId === "") {
        setNewEquipCatId(cats[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load warehouse equipments:", err);
    }
  };

  useEffect(() => {
    fetchRoomEquipments();
    fetchWarehouseData();
  }, [room.id]);

  // Handle assign equipment to room
  const handleAssignEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipId) {
      alert("Vui lòng chọn thiết bị từ danh mục kho.");
      return;
    }
    if (quantity < 1) {
      alert("Số lượng phải lớn hơn hoặc bằng 1.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/api/Rooms/${room.id}/equipments`, {
        equipmentId: Number(selectedEquipId),
        quantity: Number(quantity),
        status: equipStatus,
      });
      onNotify(`Đã phân bổ thiết bị vào phòng ${room.roomCode} thành công!`, "success");
      setShowAddForm(false);
      setSelectedEquipId("");
      setQuantity(1);
      await fetchRoomEquipments();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi khi gán thiết bị vào phòng.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle remove equipment from room
  const handleRemoveEquipment = async (equipmentId: number, equipmentName: string) => {
    if (
      !window.confirm(
        `Xác nhận thu hồi thiết bị "${equipmentName}" khỏi phòng ${room.roomCode}?`
      )
    )
      return;
    try {
      await api.delete(`/api/Rooms/${room.id}/equipments/${equipmentId}`);
      onNotify(`Đã thu hồi thiết bị "${equipmentName}" thành công!`, "success");
      await fetchRoomEquipments();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi thu hồi thiết bị.",
        "warning"
      );
    }
  };

  // Handle create equipment in warehouse
  const handleCreateWarehouseEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName.trim()) {
      alert("Vui lòng nhập tên thiết bị.");
      return;
    }
    if (!newEquipCatId) {
      alert("Vui lòng chọn danh mục thiết bị.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/Equipments", {
        code: newEquipCode.trim(),
        name: newEquipName.trim(),
        description: newEquipDesc.trim(),
        equipmentCategoryId: Number(newEquipCatId),
      });
      onNotify(`Đã thêm thiết bị "${newEquipName}" vào kho thành công!`, "success");
      setNewEquipCode("");
      setNewEquipName("");
      setNewEquipDesc("");
      await fetchWarehouseData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi tạo thiết bị mới trong kho.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content modal-large">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <TvIcon size={22} className="icon-blue-glow" /> Quản lý thiết bị — Phòng{" "}
              <span className="text-highlight">{room.roomCode}</span> ({room.name})
            </h3>
            <p className="modal-subtitle">
              Kiểm tra, cấp phát thiết bị cố định và quản lý trạng thái máy móc trong phòng.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Sub-tabs switch */}
        <div className="admin-modal-subtabs">
          <button
            type="button"
            className={`modal-subtab-btn ${
              activeSubTab === "room" ? "active-subtab" : ""
            }`}
            onClick={() => setActiveSubTab("room")}
          >
            Thiết bị trong phòng ({roomEquipments.length})
          </button>
          <button
            type="button"
            className={`modal-subtab-btn ${
              activeSubTab === "warehouse" ? "active-subtab" : ""
            }`}
            onClick={() => setActiveSubTab("warehouse")}
          >
            Kho thiết bị chung ({warehouseEquipments.length})
          </button>
        </div>

        <div className="modal-body">
          {activeSubTab === "room" ? (
            <div>
              <div className="admin-toolbar-between">
                <h4>Danh sách thiết bị trang bị tại phòng {room.roomCode}</h4>
                <button
                  type="button"
                  className="btn-toolbar-primary btn-sm"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <PlusIcon size={14} />
                  <span>{showAddForm ? "Đóng form" : "+ Gán thêm thiết bị vào phòng"}</span>
                </button>
              </div>

              {/* Add form */}
              {showAddForm && (
                <form
                  onSubmit={handleAssignEquipment}
                  className="admin-inline-add-card"
                >
                  <h5 className="inline-add-title">Phân bổ thiết bị từ kho vào phòng</h5>
                  <div className="inline-grid-3">
                    <div className="form-group-admin">
                      <label>Chọn thiết bị kho (*):</label>
                      <select
                        className="admin-input"
                        value={selectedEquipId}
                        onChange={(e) => setSelectedEquipId(Number(e.target.value))}
                        required
                      >
                        <option value="">-- Chọn thiết bị trong kho --</option>
                        {warehouseEquipments.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.code ? `[${w.code}] ` : ""}{w.name} ({w.description || "Không có mô tả"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-admin">
                      <label>Số lượng (*):</label>
                      <input
                        type="number"
                        min={1}
                        className="admin-input"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group-admin">
                      <label>Tình trạng / Ghi chú:</label>
                      <select
                        className="admin-input"
                        value={equipStatus}
                        onChange={(e) => setEquipStatus(e.target.value)}
                      >
                        <option value="Hoạt động tốt">Hoạt động tốt</option>
                        <option value="Đang sử dụng ổn định">Đang sử dụng ổn định</option>
                        <option value="Cần bảo trì nhẹ">Cần bảo trì nhẹ</option>
                        <option value="Hỏng chờ thay thế">Hỏng chờ thay thế</option>
                      </select>
                    </div>
                  </div>

                  <div className="inline-add-actions">
                    <button
                      type="button"
                      className="btn-cancel btn-sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="btn-confirm-save btn-sm"
                      disabled={submitting}
                    >
                      {submitting ? "Đang lưu..." : "✓ Xác nhận gán thiết bị"}
                    </button>
                  </div>
                </form>
              )}

              {/* Room equipments table */}
              {loading ? (
                <div className="admin-loading-state">
                  <div className="spinner-dots" />
                  <p>Đang tải dữ liệu thiết bị...</p>
                </div>
              ) : roomEquipments.length === 0 ? (
                <div className="admin-empty-state">
                  <AlertTriangleIcon size={32} className="text-muted" />
                  <p className="empty-title">Chưa có thiết bị nào trong phòng này</p>
                  <p className="empty-desc">
                    Bấm nút <strong>"+ Gán thêm thiết bị vào phòng"</strong> ở trên để phân bổ máy chiếu, máy tính, micro...
                  </p>
                </div>
              ) : (
                <div className="admin-table-responsive">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Tên thiết bị</th>
                        <th>Số lượng</th>
                        <th>Tình trạng</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomEquipments.map((eq) => (
                        <tr key={eq.equipmentId}>
                          <td className="font-semibold text-highlight">
                            {eq.equipmentName}
                          </td>
                          <td>
                            <span className="badge-count-pill">
                              {eq.quantity} chiếc/bộ
                            </span>
                          </td>
                          <td>
                            <span
                              className={`admin-status-pill ${
                                eq.status.includes("Hỏng") || eq.status.includes("bảo trì")
                                  ? "pill-rejected"
                                  : "pill-approved"
                              }`}
                            >
                              {eq.status || "Hoạt động tốt"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-danger-outline btn-xs"
                              onClick={() =>
                                handleRemoveEquipment(eq.equipmentId, eq.equipmentName)
                              }
                              title="Thu hồi thiết bị khỏi phòng"
                            >
                              ✕ Thu hồi
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Warehouse tab */}
              <div className="warehouse-grid-layout">
                {/* Add new to warehouse */}
                <div className="warehouse-left-card">
                  <h4 className="warehouse-card-title">+ Thêm thiết bị mới vào kho chung</h4>
                  <form onSubmit={handleCreateWarehouseEquip}>
                    <div className="form-group-admin">
                      <label>Danh mục thiết bị (*):</label>
                      <select
                        className="admin-input"
                        value={newEquipCatId}
                        onChange={(e) => setNewEquipCatId(Number(e.target.value))}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-admin">
                      <label>Mã thiết bị (tùy chọn):</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="VD: MC-HUIT-01, PC-P01..."
                        value={newEquipCode}
                        onChange={(e) => setNewEquipCode(e.target.value)}
                      />
                    </div>

                    <div className="form-group-admin">
                      <label>Tên thiết bị (*):</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="VD: Máy chiếu Panasonic PT-LB385..."
                        value={newEquipName}
                        onChange={(e) => setNewEquipName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group-admin">
                      <label>Mô tả chi tiết:</label>
                      <textarea
                        rows={2}
                        className="admin-textarea"
                        placeholder="Độ phân giải, cáp HDMI, pin dự phòng..."
                        value={newEquipDesc}
                        onChange={(e) => setNewEquipDesc(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-confirm-save w-full"
                      disabled={submitting}
                    >
                      {submitting ? "Đang lưu..." : "✓ Lưu vào kho thiết bị"}
                    </button>
                  </form>
                </div>

                {/* Warehouse list */}
                <div className="warehouse-right-card">
                  <h4 className="warehouse-card-title">
                    Danh mục thiết bị hiện có trong kho ({warehouseEquipments.length})
                  </h4>
                  <div className="admin-table-responsive max-h-400">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Mã</th>
                          <th>Tên thiết bị</th>
                          <th>Mô tả</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseEquipments.map((w) => (
                          <tr key={w.id}>
                            <td>
                              <span className="code-tag">{w.code || `#${w.id}`}</span>
                            </td>
                            <td className="font-semibold">{w.name}</td>
                            <td className="text-muted text-xs">{w.description || "—"}</td>
                            <td>
                              <span className="admin-status-pill pill-approved">
                                {w.status || "Active"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
