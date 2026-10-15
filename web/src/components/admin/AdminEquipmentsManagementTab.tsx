import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import {
  TvIcon,
  PlusIcon,
  SearchIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
} from "../Icon";

export interface WarehouseEquipment {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  equipmentCategoryId: number;
  categoryName?: string;
}

export interface EquipmentCategory {
  id: number;
  name: string;
  description: string;
}

function formatEquipStatus(status?: string): string {
  if (!status) return "Hoạt động tốt";
  const s = status.trim().toLowerCase();
  if (s === "active" || s === "hoạt động" || s === "hoạt động tốt" || s === "available" || s === "sẵn sàng") {
    return "Hoạt động tốt";
  }
  if (s.includes("maintenance") || s.includes("bảo trì")) {
    return "Đang bảo trì";
  }
  if (s.includes("broken") || s.includes("hỏng")) {
    return "Hỏng hóc";
  }
  if (s.includes("disposed") || s.includes("thanh lý")) {
    return "Đã thanh lý";
  }
  return status;
}

export interface RoomOption {
  id: number;
  roomCode: string;
  name: string;
}

export interface RoomEquipmentItem {
  roomId: number;
  roomName: string;
  equipmentId: number;
  equipmentName: string;
  quantity: number;
  status: string;
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminEquipmentsManagementTab({ onNotify }: Props) {
  const [subView, setSubView] = useState<"warehouse" | "byRoom" | "categories">("warehouse");
  const [equipments, setEquipments] = useState<WarehouseEquipment[]>([]);
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | "">("");
  const [roomEquipments, setRoomEquipments] = useState<RoomEquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("ALL");

  // Create Warehouse Equip modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formCode, setFormCode] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formCatId, setFormCatId] = useState<number | "">("");

  // Assign to room modal
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignEquipId, setAssignEquipId] = useState<number | "">("");
  const [assignQuantity, setAssignQuantity] = useState<number>(1);
  const [assignStatus, setAssignStatus] = useState<string>("Hoạt động tốt");

  // Create Category modal
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [catName, setCatName] = useState<string>("");
  const [catDesc, setCatDesc] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch all warehouse data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [equipRes, catRes, roomsRes] = await Promise.all([
        api.get("/api/Equipments"),
        api.get("/api/EquipmentCategories"),
        api.get("/api/Rooms"),
      ]);

      const eqList = equipRes.data?.data || equipRes.data || [];
      const cList = catRes.data?.data || catRes.data || [];
      const rList = roomsRes.data?.data || roomsRes.data || [];

      // Map category name
      const catMap = new Map(cList.map((c: EquipmentCategory) => [c.id, c.name]));
      const mappedEquips = eqList.map((e: WarehouseEquipment) => ({
        ...e,
        categoryName: catMap.get(e.equipmentCategoryId) || "Chung",
      }));

      setEquipments(mappedEquips);
      setCategories(cList);
      setRooms(rList);

      if (rList.length > 0 && selectedRoomId === "") {
        setSelectedRoomId(rList[0].id);
      }
      if (cList.length > 0 && formCatId === "") {
        setFormCatId(cList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load equipment data:", err);
      onNotify("Không thể tải danh mục thiết bị từ máy chủ.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch room equipments when selected room changes
  const fetchRoomEquips = async (roomId: number) => {
    try {
      const res = await api.get(`/api/Rooms/${roomId}/equipments`);
      setRoomEquipments(res.data?.data || res.data || []);
    } catch (err: any) {
      console.error("Failed to load room equipments:", err);
    }
  };

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomEquips(Number(selectedRoomId));
    }
  }, [selectedRoomId]);

  // Filtered warehouse equipments
  const filteredEquipments = useMemo(() => {
    return equipments.filter((e) => {
      if (catFilter !== "ALL" && String(e.equipmentCategoryId) !== catFilter)
        return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCode = (e.code || "").toLowerCase().includes(q);
        const matchesName = (e.name || "").toLowerCase().includes(q);
        const matchesDesc = (e.description || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [equipments, catFilter, searchTerm]);

  // Handle Create Equipment in Warehouse
  const handleCreateEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCatId) {
      alert("Vui lòng nhập tên thiết bị và chọn danh mục.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/Equipments", {
        code: formCode.trim(),
        name: formName.trim(),
        description: formDesc.trim(),
        equipmentCategoryId: Number(formCatId),
      });
      onNotify(`Đã thêm thiết bị "${formName}" vào kho thành công!`, "success");
      setShowAddModal(false);
      setFormCode("");
      setFormName("");
      setFormDesc("");
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi tạo thiết bị mới.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign Equipment to Room
  const handleAssignToRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !assignEquipId) {
      alert("Vui lòng chọn phòng và thiết bị cần gán.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/api/Rooms/${selectedRoomId}/equipments`, {
        equipmentId: Number(assignEquipId),
        quantity: Number(assignQuantity),
        status: assignStatus,
      });
      onNotify("Đã phân bổ thiết bị vào phòng thành công!", "success");
      setShowAssignModal(false);
      setAssignEquipId("");
      setAssignQuantity(1);
      await fetchRoomEquips(Number(selectedRoomId));
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi khi gán thiết bị vào phòng.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Remove Equipment from Room
  const handleRemoveFromRoom = async (equipId: number, equipName: string) => {
    if (!window.confirm(`Xác nhận thu hồi thiết bị "${equipName}" khỏi phòng?`))
      return;
    try {
      await api.delete(`/api/Rooms/${selectedRoomId}/equipments/${equipId}`);
      onNotify(`Đã thu hồi thiết bị "${equipName}" thành công!`, "info");
      await fetchRoomEquips(Number(selectedRoomId));
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi thu hồi thiết bị khỏi phòng.",
        "warning"
      );
    }
  };

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert("Vui lòng nhập tên danh mục.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/EquipmentCategories", {
        name: catName.trim(),
        description: catDesc.trim(),
      });
      onNotify(`Đã tạo danh mục "${catName}" thành công!`, "success");
      setShowCatModal(false);
      setCatName("");
      setCatDesc("");
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi tạo danh mục thiết bị.",
        "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-subtab-container">
      {/* 1. Header Toolbar */}
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <TvIcon size={24} className="icon-blue-glow" /> Quản lý trang thiết bị phòng học & Kho
          </h2>
          <p className="admin-subtab-subtitle">
            Quản lý kho thiết bị trung tâm (máy chiếu, micro, hub chuyển đổi) và phân bổ tài sản cố định vào phòng.
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
          {subView === "warehouse" && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon size={16} /> + Thêm thiết bị vào kho
            </button>
          )}
          {subView === "byRoom" && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowAssignModal(true)}
            >
              <PlusIcon size={16} /> + Gán thiết bị vào phòng này
            </button>
          )}
          {subView === "categories" && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowCatModal(true)}
            >
              <PlusIcon size={16} /> + Thêm loại danh mục
            </button>
          )}
        </div>
      </div>

      {/* 2. Sub-views Switch */}
      <div className="admin-filter-bar">
        <div className="admin-status-filters">
          <button
            type="button"
            className={`filter-pill-btn ${
              subView === "warehouse" ? "active-pill" : ""
            }`}
            onClick={() => setSubView("warehouse")}
          >
            Kho thiết bị chung ({equipments.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${
              subView === "byRoom" ? "active-pill" : ""
            }`}
            onClick={() => setSubView("byRoom")}
          >
            Thiết bị theo phòng học
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${
              subView === "categories" ? "active-pill" : ""
            }`}
            onClick={() => setSubView("categories")}
          >
            Danh mục loại thiết bị ({categories.length})
          </button>
        </div>

        {subView === "warehouse" && (
          <div className="flex-gap-10">
            <select
              className="admin-select-filter"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="ALL">-- Tất cả danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="admin-search-box max-w-300">
              <SearchIcon size={16} className="search-icon-muted" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên thiết bị..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        {subView === "byRoom" && (
          <div className="flex-gap-10 align-center">
            <span className="text-sm font-semibold text-slate-700">Chọn phòng kiểm tra:</span>
            <select
              className="admin-select-filter font-bold text-highlight"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomCode} — {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Main Content Views */}
      {subView === "warehouse" && (
        <div>
          {loading ? (
            <div className="admin-loading-state">
              <div className="spinner-dots" />
              <p>Đang tải danh sách thiết bị kho...</p>
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="admin-empty-state">
              <AlertTriangleIcon size={36} className="text-muted" />
              <p className="empty-title">Không tìm thấy thiết bị nào trong kho</p>
            </div>
          ) : (
            <div className="admin-table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Mã thiết bị</th>
                    <th>Tên thiết bị</th>
                    <th>Danh mục</th>
                    <th>Mô tả chi tiết</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipments.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className="code-tag">{e.code || `#${e.id}`}</span>
                      </td>
                      <td className="font-semibold text-highlight">{e.name}</td>
                      <td>
                        <span className="tag-room-type">{e.categoryName}</span>
                      </td>
                      <td className="text-sm text-muted">{e.description || "—"}</td>
                      <td>
                        <span className="admin-status-pill pill-approved flex items-center gap-1">
                          <CheckIcon size={12} />
                          <span>{formatEquipStatus(e.status)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subView === "byRoom" && (
        <div>
          {roomEquipments.length === 0 ? (
            <div className="admin-empty-state">
              <AlertTriangleIcon size={36} className="text-muted" />
              <p className="empty-title">Phòng này chưa được gán thiết bị nào</p>
              <p className="empty-desc">
                Bấm nút <strong>"+ Gán thiết bị vào phòng này"</strong> ở góc trên để phân bổ máy chiếu, máy tính, v.v.
              </p>
            </div>
          ) : (
            <div className="admin-table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Tên thiết bị</th>
                    <th>Số lượng trang bị</th>
                    <th>Tình trạng thực tế</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {roomEquipments.map((req) => (
                    <tr key={req.equipmentId}>
                      <td className="font-semibold text-highlight">
                        {req.equipmentName}
                      </td>
                      <td>
                        <span className="badge-count-pill">
                          {req.quantity} bộ/chiếc
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-pill flex items-center gap-1 ${
                            req.status.includes("Hỏng") || req.status.includes("bảo trì")
                              ? "pill-rejected"
                              : "pill-approved"
                          }`}
                        >
                          <CheckIcon size={12} />
                          <span>{formatEquipStatus(req.status)}</span>
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger-outline btn-xs"
                          onClick={() =>
                            handleRemoveFromRoom(req.equipmentId, req.equipmentName)
                          }
                          title="Thu hồi thiết bị khỏi phòng"
                        >
                          <XIcon size={12} /> Thu hồi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subView === "categories" && (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục thiết bị</th>
                <th>Mô tả quy cách</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="code-tag">#{c.id}</span>
                  </td>
                  <td className="font-semibold text-highlight">{c.name}</td>
                  <td className="text-sm text-muted">{c.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Equipment to Warehouse */}
      {showAddModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Thêm thiết bị mới vào kho</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEquip}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Danh mục phân loại (*):</label>
                  <select
                    className="admin-input"
                    value={formCatId}
                    onChange={(e) => setFormCatId(Number(e.target.value))}
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
                    placeholder="VD: MC-HUIT-01, MIC-B201..."
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                  />
                </div>

                <div className="form-group-admin">
                  <label>Tên thiết bị (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: Máy chiếu Panasonic PT-LB385..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Mô tả kỹ thuật:</label>
                  <textarea
                    rows={3}
                    className="admin-textarea"
                    placeholder="Thông số, cổng HDMI/VGA, cáp nguồn..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "Xác nhận lưu kho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Equipment to Room */}
      {showAssignModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Phân bổ thiết bị vào phòng</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAssignModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignToRoom}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Chọn thiết bị từ kho (*):</label>
                  <select
                    className="admin-input"
                    value={assignEquipId}
                    onChange={(e) => setAssignEquipId(Number(e.target.value))}
                    required
                  >
                    <option value="">-- Chọn thiết bị kho --</option>
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.code ? `[${eq.code}] ` : ""}{eq.name} ({eq.categoryName})
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
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Tình trạng thiết bị:</label>
                  <select
                    className="admin-input"
                    value={assignStatus}
                    onChange={(e) => setAssignStatus(e.target.value)}
                  >
                    <option value="Hoạt động tốt">Hoạt động tốt</option>
                    <option value="Đang sử dụng ổn định">Đang sử dụng ổn định</option>
                    <option value="Cần bảo trì nhẹ">Cần bảo trì nhẹ</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAssignModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "Xác nhận phân bổ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Category */}
      {showCatModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">+ Thêm danh mục loại thiết bị</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCatModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Tên danh mục (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="VD: Máy chiếu, Loa & Micro, Màn hình tương tác..."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Mô tả quy cách:</label>
                  <textarea
                    rows={3}
                    className="admin-textarea"
                    placeholder="Mô tả tiêu chuẩn thiết bị..."
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCatModal(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "Lưu danh mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
