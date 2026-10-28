import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../../lib/api";
import {
  TvIcon,
  PlusIcon,
  SearchIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  CheckIcon,
  CheckCircleIcon,
  XIcon,
  WrenchIcon,
  BanIcon,
  ChevronDownIcon,
  PencilIcon,
  TrashIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";

export interface WarehouseEquipment {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  equipmentCategoryId: number;
  categoryName?: string;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity: number;
}

export interface EquipmentCategory {
  id: number;
  name: string;
  description: string;
}

export function isUnderMaintenance(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s.includes("bảo trì") || s.includes("maintenance");
}

export function formatEquipStatus(status?: string): string {
  if (!status) return "Đang hoạt động";
  const s = status.trim().toLowerCase();
  if (s === "active" || s === "hoạt động" || s === "hoạt động tốt" || s === "available" || s === "sẵn sàng" || s === "đang hoạt động") {
    return "Đang hoạt động";
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

function WarehouseStatusDropdown({
  equipment,
  isUpdating,
  onChangeStatus,
}: {
  equipment: WarehouseEquipment;
  isUpdating: boolean;
  onChangeStatus: (eq: WarehouseEquipment, newStatus: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMaint = isUnderMaintenance(equipment.status);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setOpen((prev) => !prev)}
        className={`admin-status-pill ${isMaint ? "pill-maintenance" : "pill-approved"}`}
        title="Bấm để chuyển trạng thái thiết bị (Đang hoạt động / Bảo trì)"
      >
        {isUpdating ? (
          <RefreshCwIcon size={13} className="animate-spin" />
        ) : isMaint ? (
          <WrenchIcon size={13} />
        ) : (
          <CheckCircleIcon size={13} />
        )}
        <span>{isMaint ? "Đang bảo trì" : "Đang hoạt động"}</span>
        <span
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            opacity: 0.75,
            marginLeft: 2,
          }}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      {open && (
        <div className="status-dropdown-menu">
          <button
            type="button"
            className={`status-dropdown-item ${!isMaint ? "active-selected" : ""}`}
            onClick={() => {
              setOpen(false);
              if (isMaint) onChangeStatus(equipment, "Đang hoạt động");
            }}
          >
            <span style={{ color: "#15803d", display: "inline-flex", flexShrink: 0 }}>
              <CheckCircleIcon size={14} />
            </span>
            <span>Đang hoạt động</span>
          </button>
          <button
            type="button"
            className={`status-dropdown-item ${isMaint ? "maintenance-selected" : ""}`}
            onClick={() => {
              setOpen(false);
              if (!isMaint) onChangeStatus(equipment, "Đang bảo trì");
            }}
          >
            <span style={{ color: "#c2410c", display: "inline-flex", flexShrink: 0 }}>
              <WrenchIcon size={14} />
            </span>
            <span>Đang bảo trì</span>
          </button>
        </div>
      )}

      {isMaint && (
        <div className="status-dropdown-hint">
          <span style={{ color: "#c2410c", display: "inline-flex", flexShrink: 0 }}>
            <AlertTriangleIcon size={11} />
          </span>
          <span>(Không thể gán phòng)</span>
        </div>
      )}
    </div>
  );
}

const ROOM_STATUS_CONFIG: Record<
  string,
  { label: string; icon: (props: { size?: number; className?: string }) => React.ReactNode; iconColor: string; pillClass: string }
> = {
  "Hoạt động tốt": { label: "Hoạt động tốt", icon: CheckCircleIcon, iconColor: "#15803d", pillClass: "pill-approved" },
  "Đang sử dụng ổn định": { label: "Đang sử dụng ổn định", icon: CheckIcon, iconColor: "#15803d", pillClass: "pill-approved" },
  "Cần bảo trì nhẹ": { label: "Cần bảo trì nhẹ", icon: WrenchIcon, iconColor: "#c2410c", pillClass: "pill-maintenance" },
  "Đang bảo trì": { label: "Đang bảo trì", icon: WrenchIcon, iconColor: "#c2410c", pillClass: "pill-maintenance" },
  "Hỏng hóc": { label: "Hỏng hóc", icon: BanIcon, iconColor: "#b91c1c", pillClass: "pill-rejected" },
};

function RoomEquipStatusDropdown({
  item,
  onChangeStatus,
}: {
  item: RoomEquipmentItem;
  onChangeStatus: (item: RoomEquipmentItem, newStatus: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cfg = ROOM_STATUS_CONFIG[item.status] || {
    label: item.status,
    icon: item.status.includes("Hỏng") ? BanIcon : item.status.includes("bảo trì") ? WrenchIcon : CheckCircleIcon,
    iconColor: item.status.includes("Hỏng") ? "#b91c1c" : item.status.includes("bảo trì") ? "#c2410c" : "#15803d",
    pillClass: item.status.includes("Hỏng") ? "pill-rejected" : item.status.includes("bảo trì") ? "pill-maintenance" : "pill-approved",
  };
  const IconComp = cfg.icon;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="status-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`admin-status-pill ${cfg.pillClass}`}
        title="Bấm để thay đổi tình trạng thiết bị trong phòng"
      >
        <span style={{ color: cfg.iconColor, display: "inline-flex", flexShrink: 0 }}>
          <IconComp size={13} />
        </span>
        <span>{cfg.label}</span>
        <span
          style={{
            display: "inline-flex",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
            opacity: 0.75,
            marginLeft: 2,
          }}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      {open && (
        <div className="status-dropdown-menu" style={{ minWidth: "185px" }}>
          {Object.entries(ROOM_STATUS_CONFIG).map(([val, conf]) => {
            const OptionIcon = conf.icon;
            const isSelected = item.status === val;
            let itemClass = "status-dropdown-item";
            if (isSelected) {
              if (val.includes("Hỏng")) itemClass += " broken-selected";
              else if (val.includes("bảo trì")) itemClass += " maintenance-selected";
              else itemClass += " active-selected";
            }
            return (
              <button
                key={val}
                type="button"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  if (item.status !== val) {
                    onChangeStatus(item, val);
                  }
                }}
              >
                <span style={{ color: conf.iconColor, display: "inline-flex", flexShrink: 0 }}>
                  <OptionIcon size={14} />
                </span>
                <span>{conf.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminEquipmentsManagementTab({ onNotify }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm, alert } = useConfirm();
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
  const [formTotalQty, setFormTotalQty] = useState<number>(10);
  const [formStatus, setFormStatus] = useState<string>("Đang hoạt động");

  // Edit Warehouse Equip modal
  const [editingEquip, setEditingEquip] = useState<WarehouseEquipment | null>(null);
  const [editCode, setEditCode] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editCatId, setEditCatId] = useState<number | "">("");
  const [editTotalQty, setEditTotalQty] = useState<number>(1);
  const [editStatus, setEditStatus] = useState<string>("Đang hoạt động");

  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

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
  }, [selectedRoomId, subView]);

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

  // Quick toggle / update equipment status in warehouse
  const handleQuickChangeStatus = async (eq: WarehouseEquipment, newStatus: string) => {
    try {
      setUpdatingStatusId(eq.id);
      await api.patch(`/api/Equipments/${eq.id}/status`, {
        status: newStatus,
      });
      onNotify(`Đã chuyển trạng thái thiết bị "${eq.name}" sang "${newStatus}"!`, "success");
      await fetchData();
      if (selectedRoomId) {
        await fetchRoomEquips(Number(selectedRoomId));
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi khi cập nhật trạng thái thiết bị.",
        "warning"
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Update room equipment condition
  const handleUpdateRoomEquipStatus = async (item: RoomEquipmentItem, newStatus: string) => {
    if (!selectedRoomId) return;
    try {
      await api.post(`/api/Rooms/${selectedRoomId}/equipments`, {
        equipmentId: item.equipmentId,
        quantity: item.quantity,
        status: newStatus,
      });
      onNotify(`Đã cập nhật tình trạng thiết bị "${item.equipmentName}" trong phòng thành "${newStatus}".`, "success");
      await fetchRoomEquips(Number(selectedRoomId));
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi khi cập nhật tình trạng thiết bị trong phòng.",
        "warning"
      );
    }
  };

  // Handle Create Equipment in Warehouse
  const handleCreateEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCatId) {
      alert("Vui lòng nhập tên thiết bị và chọn danh mục.");
      return;
    }
    const totalQty = Number(formTotalQty);
    if (!totalQty || totalQty < 1) {
      alert("Số lượng tổng nhập kho phải lớn hơn hoặc bằng 1.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/api/Equipments", {
        code: formCode.trim(),
        name: formName.trim(),
        description: formDesc.trim(),
        equipmentCategoryId: Number(formCatId),
        totalQuantity: totalQty,
        status: formStatus,
      });
      onNotify(`Đã thêm thiết bị "${formName}" vào kho thành công với số lượng ${totalQty}!`, "success");
      setShowAddModal(false);
      setFormCode("");
      setFormName("");
      setFormDesc("");
      setFormTotalQty(10);
      setFormStatus("Đang hoạt động");
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

  const handleOpenEdit = (eq: WarehouseEquipment) => {
    setEditingEquip(eq);
    setEditCode(eq.code || "");
    setEditName(eq.name || "");
    setEditDesc(eq.description || "");
    setEditCatId(eq.equipmentCategoryId);
    setEditTotalQty(eq.totalQuantity || 1);
    setEditStatus(isUnderMaintenance(eq.status) ? "Đang bảo trì" : "Đang hoạt động");
  };

  const handleUpdateEquip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquip) return;
    if (!editName.trim() || !editCatId) {
      alert("Vui lòng nhập tên thiết bị và chọn danh mục.");
      return;
    }
    const totalQty = Number(editTotalQty);
    if (!totalQty || totalQty < 1) {
      alert("Số lượng tổng nhập kho phải lớn hơn hoặc bằng 1.");
      return;
    }
    if (totalQty < (editingEquip.allocatedQuantity || 0)) {
      alert(
        `Tổng số lượng (${totalQty}) không thể nhỏ hơn số lượng đang phân bổ trong các phòng (${editingEquip.allocatedQuantity || 0} chiếc).`
      );
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/api/Equipments/${editingEquip.id}`, {
        code: editCode.trim(),
        name: editName.trim(),
        description: editDesc.trim(),
        equipmentCategoryId: Number(editCatId),
        totalQuantity: totalQty,
        status: editStatus,
      });
      onNotify(`Đã cập nhật thiết bị "${editName}" thành công!`, "success");
      setEditingEquip(null);
      await fetchData();
      if (selectedRoomId) {
        await fetchRoomEquips(Number(selectedRoomId));
      }
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Lỗi khi cập nhật thiết bị.",
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
    const selectedEquip = equipments.find((eq) => eq.id === Number(assignEquipId));
    if (selectedEquip && isUnderMaintenance(selectedEquip.status)) {
      alert("Thiết bị này đang trong trạng thái bảo trì, không được phép phân bổ vào phòng hoặc sử dụng!");
      return;
    }

    const currentInRoom = roomEquipments.find((r) => r.equipmentId === Number(assignEquipId))?.quantity || 0;
    const maxAllowed = (selectedEquip?.availableQuantity ?? 0) + currentInRoom;

    if (selectedEquip && assignQuantity > maxAllowed) {
      alert(
        `Số lượng phân bổ (${assignQuantity}) vượt quá số lượng khả dụng trong kho (kho hiện còn ${selectedEquip.availableQuantity} chiếc khả dụng).`
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(`/api/Rooms/${selectedRoomId}/equipments`, {
        equipmentId: Number(assignEquipId),
        quantity: Number(assignQuantity),
        status: assignStatus,
      });
      onNotify(res.data?.message || "Đã phân bổ thiết bị vào phòng thành công!", "success");
      setShowAssignModal(false);
      setAssignEquipId("");
      setAssignQuantity(1);
      await Promise.all([fetchRoomEquips(Number(selectedRoomId)), fetchData()]);
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
    if (!selectedRoomId) return;
    const selectedRoom = rooms.find((r) => r.id === Number(selectedRoomId));
    const confirmed = await confirm({
      title: "Xác nhận thu hồi thiết bị khỏi phòng",
      message: `Bạn có chắc chắn muốn thu hồi thiết bị "${equipName}" khỏi phòng ${selectedRoom?.roomCode || ""}?`,
      subMessage: "Toàn bộ số lượng thiết bị đang phân bổ trong phòng sẽ được hoàn trả về kho tổng.",
      itemDetails: [
        { label: "Phòng", value: selectedRoom ? `${selectedRoom.name} (${selectedRoom.roomCode})` : "—" },
        { label: "Thiết bị thu hồi", value: equipName },
      ],
      type: "warning",
      confirmText: "Xác nhận thu hồi",
      cancelText: "Hủy bỏ",
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/api/Rooms/${selectedRoomId}/equipments/${equipId}`);
      onNotify(res.data?.message || `Đã thu hồi thiết bị "${equipName}" và hoàn trả về kho thành công!`, "info");
      await Promise.all([fetchRoomEquips(Number(selectedRoomId)), fetchData()]);
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Lỗi khi thu hồi thiết bị khỏi phòng.",
        "warning"
      );
    }
  };

  // Handle Delete Equipment from Warehouse
  const handleDeleteEquipment = async (e: WarehouseEquipment) => {
    if ((e.allocatedQuantity ?? 0) > 0) {
      await alert({
        title: "Không thể xóa thiết bị",
        message: `Thiết bị "${e.name}" (${e.code || `#${e.id}`}) hiện đang được phân bổ vào các phòng học (Số lượng đang phân bổ: ${e.allocatedQuantity} chiếc).`,
        subMessage: "Vui lòng thu hồi toàn bộ thiết bị này khỏi các phòng học về kho trước khi thực hiện xóa khỏi hệ thống.",
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Xác nhận xóa thiết bị khỏi kho",
      message: `Bạn có chắc chắn muốn xóa thiết bị "${e.name}" (${e.code || `#${e.id}`}) khỏi kho thiết bị tổng?`,
      subMessage: "Hành động này sẽ xóa vĩnh viễn thiết bị khỏi danh mục quản lý kho của thư viện.",
      itemDetails: [
        { label: "Mã thiết bị", value: e.code || `#${e.id}` },
        { label: "Tên thiết bị", value: e.name },
        { label: "Danh mục", value: e.categoryName || "—" },
        { label: "Tổng số lượng trong kho", value: `${e.totalQuantity} chiếc` },
        { label: "Trạng thái", value: formatEquipStatus(e.status) },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/api/Equipments/${e.id}`);
      onNotify(`Đã xóa thiết bị "${e.name}" khỏi kho thành công!`, "info");
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Không thể xóa thiết bị này.",
        "warning"
      );
    }
  };

  // Handle Delete Equipment Category
  const handleDeleteCategory = async (c: EquipmentCategory) => {
    const attachedCount = equipments.filter((eq) => eq.equipmentCategoryId === c.id).length;
    if (attachedCount > 0) {
      await alert({
        title: "Không thể xóa danh mục",
        message: `Danh mục "${c.name}" hiện đang chứa ${attachedCount} thiết bị trong kho.`,
        subMessage: "Vui lòng xóa hoặc di chuyển các thiết bị này sang danh mục khác trước khi xóa danh mục.",
        type: "warning",
      });
      return;
    }

    const confirmed = await confirm({
      title: "Xác nhận xóa danh mục thiết bị",
      message: `Bạn có chắc chắn muốn xóa danh mục thiết bị "${c.name}"?`,
      subMessage: "Dữ liệu danh mục đã xóa sẽ không thể phục hồi.",
      itemDetails: [
        { label: "Mã danh mục", value: `#${c.id}` },
        { label: "Tên danh mục", value: c.name },
        { label: "Mô tả", value: c.description || "—" },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/api/EquipmentCategories/${c.id}`);
      onNotify(`Đã xóa danh mục "${c.name}" thành công!`, "info");
      await fetchData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || err.response?.data || "Không thể xóa danh mục này.",
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
          {subView === "warehouse" && isAdmin && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon size={16} /> Thêm thiết bị vào kho
            </button>
          )}
          {subView === "byRoom" && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowAssignModal(true)}
            >
              <PlusIcon size={16} /> Gán thiết bị vào phòng này
            </button>
          )}
          {subView === "categories" && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={() => setShowCatModal(true)}
            >
              <PlusIcon size={16} /> Thêm loại danh mục
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
                    <th>Tổng SL</th>
                    <th>Đã phân bổ</th>
                    <th>Còn trong kho</th>
                    <th>Mô tả chi tiết</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
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
                      <td>
                        <span className="font-bold text-slate-800">{e.totalQuantity ?? 0}</span>
                      </td>
                      <td>
                        <span className="badge-count-pill">{e.allocatedQuantity ?? 0}</span>
                      </td>
                      <td>
                        <span
                          className={`admin-status-pill flex items-center gap-1 ${
                            (e.availableQuantity ?? 0) > 0 ? "pill-approved" : "pill-rejected"
                          }`}
                        >
                          <CheckIcon size={12} />
                          <span>{e.availableQuantity ?? 0} chiếc</span>
                        </span>
                      </td>
                      <td className="text-sm text-muted">{e.description || "—"}</td>
                      <td>
                        <WarehouseStatusDropdown
                          equipment={e}
                          isUpdating={updatingStatusId === e.id}
                          onChangeStatus={handleQuickChangeStatus}
                        />
                      </td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-shift-action btn-shift-edit"
                            onClick={() => handleOpenEdit(e)}
                            title="Chỉnh sửa thông số và số lượng kho"
                          >
                            <PencilIcon size={12} />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            className="btn-shift-action btn-shift-delete"
                            onClick={() => handleDeleteEquipment(e)}
                            title="Xóa thiết bị khỏi kho"
                          >
                            <TrashIcon size={12} />
                            <span>Xóa</span>
                          </button>
                        </div>
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
                    <th style={{ width: "140px", textAlign: "right" }}>Thao tác</th>
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
                        <RoomEquipStatusDropdown
                          item={req}
                          onChangeStatus={handleUpdateRoomEquipStatus}
                        />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-shift-action btn-shift-delete"
                          onClick={() =>
                            handleRemoveFromRoom(req.equipmentId, req.equipmentName)
                          }
                          title="Thu hồi thiết bị khỏi phòng"
                        >
                          <TrashIcon size={12} />
                          <span>Thu hồi</span>
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
                <th style={{ width: "80px" }}>ID</th>
                <th>Tên danh mục thiết bị</th>
                <th>Mô tả quy cách</th>
                <th style={{ width: "120px", textAlign: "right" }}>Thao tác</th>
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
                  <td style={{ textAlign: "right" }}>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn-shift-action btn-shift-delete"
                        onClick={() => handleDeleteCategory(c)}
                        title="Xóa danh mục thiết bị"
                      >
                        <TrashIcon size={12} />
                        <span>Xóa</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Mặc định</span>
                    )}
                  </td>
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
                  <label>Tổng số lượng nhập kho (*):</label>
                  <input
                    type="number"
                    min={1}
                    className="admin-input"
                    placeholder="VD: 10, 20..."
                    value={formTotalQty}
                    onChange={(e) => setFormTotalQty(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái ban đầu:</label>
                  <select
                    className="admin-input font-medium"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Đang hoạt động">Đang hoạt động</option>
                    <option value="Đang bảo trì">Đang bảo trì</option>
                  </select>
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

      {/* Modal: Edit Equipment in Warehouse */}
      {editingEquip && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Chỉnh sửa thiết bị kho</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingEquip(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateEquip}>
              <div className="modal-body">
                <div className="form-group-admin">
                  <label>Danh mục phân loại (*):</label>
                  <select
                    className="admin-input"
                    value={editCatId}
                    onChange={(e) => setEditCatId(Number(e.target.value))}
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
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                  />
                </div>

                <div className="form-group-admin">
                  <label>Tên thiết bị (*):</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-admin">
                  <label>Trạng thái hoạt động (*):</label>
                  <select
                    className="admin-input font-medium"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Đang hoạt động">Đang hoạt động</option>
                    <option value="Đang bảo trì">Đang bảo trì</option>
                  </select>
                  {isUnderMaintenance(editStatus) && (
                    <span className="text-xs text-amber-700 flex items-center gap-1.5 mt-1 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                      <AlertTriangleIcon size={15} className="flex-shrink-0 text-amber-600" />
                      <span>Thiết bị bảo trì sẽ không được phép thêm vào phòng học hoặc đưa vào sử dụng.</span>
                    </span>
                  )}
                </div>

                <div className="form-group-admin">
                  <label>Tổng số lượng trong kho (*):</label>
                  <input
                    type="number"
                    min={editingEquip.allocatedQuantity || 1}
                    className="admin-input"
                    value={editTotalQty}
                    onChange={(e) => setEditTotalQty(Number(e.target.value))}
                    required
                  />
                  <span className="text-xs text-muted block mt-1">
                    Đang phân bổ trong phòng: <strong>{editingEquip.allocatedQuantity ?? 0}</strong> chiếc (Tổng số lượng không thể nhỏ hơn số lượng đã phân bổ).
                  </span>
                </div>

                <div className="form-group-admin">
                  <label>Mô tả kỹ thuật:</label>
                  <textarea
                    rows={3}
                    className="admin-textarea"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditingEquip(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-confirm-save"
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : "Lưu thay đổi"}
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
                    {equipments.map((eq) => {
                      const isMaint = isUnderMaintenance(eq.status);
                      return (
                        <option key={eq.id} value={eq.id} disabled={isMaint}>
                          {eq.code ? `[${eq.code}] ` : ""}{eq.name} — {isMaint ? "[ĐANG BẢO TRÌ - KHÔNG THỂ PHÂN BỔ]" : `Còn trong kho: ${eq.availableQuantity ?? 0}/${eq.totalQuantity ?? 0} chiếc (${eq.categoryName})`}
                        </option>
                      );
                    })}
                  </select>
                  {assignEquipId && (() => {
                    const targetEq = equipments.find((eq) => eq.id === Number(assignEquipId));
                    if (!targetEq) return null;
                    if (isUnderMaintenance(targetEq.status)) {
                      return (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs mt-2 font-medium flex items-center gap-1.5">
                          <BanIcon size={15} className="flex-shrink-0 text-rose-600" />
                          <span>Thiết bị này đang ở trạng thái <strong>Đang bảo trì</strong>, không được phép phân bổ vào phòng học hoặc đưa vào sử dụng.</span>
                        </div>
                      );
                    }
                    return (
                      <span className="text-xs text-muted block mt-1">
                        Tồn kho khả dụng: <strong className="text-highlight">{targetEq.availableQuantity ?? 0}</strong> chiếc (Tổng: {targetEq.totalQuantity ?? 0} | Đang phân bổ: {targetEq.allocatedQuantity ?? 0})
                      </span>
                    );
                  })()}
                </div>

                <div className="form-group-admin">
                  <label>Số lượng (*):</label>
                  <input
                    type="number"
                    min={1}
                    max={(() => {
                      const targetEq = equipments.find((eq) => eq.id === Number(assignEquipId));
                      const curInRoom = roomEquipments.find((r) => r.equipmentId === Number(assignEquipId))?.quantity || 0;
                      return targetEq ? targetEq.availableQuantity + curInRoom : undefined;
                    })()}
                    className="admin-input"
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(Number(e.target.value))}
                    required
                  />
                  {assignEquipId && (() => {
                    const targetEq = equipments.find((eq) => eq.id === Number(assignEquipId));
                    const curInRoom = roomEquipments.find((r) => r.equipmentId === Number(assignEquipId))?.quantity || 0;
                    const maxAllowed = targetEq ? targetEq.availableQuantity + curInRoom : 0;
                    return (
                      <span className="text-xs text-slate-500 block mt-1">
                        Tối đa có thể gán: <strong>{maxAllowed}</strong> chiếc
                      </span>
                    );
                  })()}
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
