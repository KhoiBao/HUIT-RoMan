import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  WrenchIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  DoorIcon,
  TvIcon,
  DotsIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import {
  type IncidentReportItem,
  type IncidentStatus,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStats,
  fetchIncidents,
  fetchIncidentStats,
  createIncident,
  updateIncident,
  resolveIncident,
  deleteIncident,
  restoreRoomToAvailable,
} from "../../lib/incidents";
import { api } from "../../lib/api";
import AdminPagination from "../common/AdminPagination";
import { formatDateTime24h } from "../../lib/dateTimeFormat";

interface AdminIncidentsTabProps {
  onNotify: (msg: string, type?: "success" | "warning") => void;
  onSwitchTab?: (tab: string) => void;
  initialRoomCode?: string;
}

export default function AdminIncidentsTab({
  onNotify,
  onSwitchTab,
  initialRoomCode,
}: AdminIncidentsTabProps) {
  const { confirm } = useConfirm();

  const [incidents, setIncidents] = useState<IncidentReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [roomFilter, setRoomFilter] = useState<string>(initialRoomCode || "ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Available Rooms for dropdown
  const [dbRooms, setDbRooms] = useState<Array<{ id: number; roomCode: string; name: string; status: string }>>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportItem | null>(null);

  // Dropdown Action Menu (3 dots) state & handlers
  const [rowMenu, setRowMenu] = useState<{
    key: string | number;
    top: number;
    left: number;
    openUp?: boolean;
  } | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rowMenu) return;
    const close = () => setRowMenu(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (rowMenuRef.current?.contains(target)) return;
      if (target.closest(".btn-table-more")) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [rowMenu]);

  function toggleRowMenu(key: string | number, btn: HTMLElement) {
    if (rowMenu?.key === key) {
      setRowMenu(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 150;
    const openUp =
      rect.bottom + menuHeight + 12 > window.innerHeight &&
      rect.top > menuHeight + 12;
    setRowMenu({
      key,
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      openUp,
    });
  }

  // Form State: Create
  const [createForm, setCreateForm] = useState({
    targetType: "Phòng" as "Phòng" | "Thiết bị",
    roomCode: initialRoomCode || "B202",
    roomId: undefined as number | undefined,
    roomName: "",
    equipmentName: "",
    category: "Thiết bị hư hỏng" as IncidentCategory,
    severity: "Khẩn cấp" as IncidentSeverity,
    description: "",
    reportedBy: "Thủ thư trực ca",
    reporterPhone: "",
    assignedTechnician: "",
    setRoomMaintenance: true,
  });

  // Form State: Edit / Resolve
  const [editForm, setEditForm] = useState({
    status: "Đang bảo trì" as IncidentStatus,
    category: "Thiết bị hư hỏng" as IncidentCategory,
    severity: "Khẩn cấp" as IncidentSeverity,
    description: "",
    equipmentName: "",
    assignedTechnician: "",
    technicianNote: "",
    repairCost: 0,
    restoreRoomToAvailable: true,
  });

  // Statistics
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    pending: 0,
    inMaintenance: 0,
    resolved: 0,
    urgent: 0,
  });

  // Load incidents & DB rooms
  const loadData = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        fetchIncidents(),
        fetchIncidentStats(),
      ]);
      setIncidents(data);
      setStats(statsData);

      try {
        const res = await api.get("/api/Rooms");
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setDbRooms(list);
        }
      } catch {
        // Fallback keep default
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomFilter(initialRoomCode);
    }
  }, [initialRoomCode]);

  // Filtered List
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      // Room filter
      if (roomFilter !== "ALL" && item.roomCode.toLowerCase() !== roomFilter.toLowerCase()) {
        return false;
      }
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      // Severity filter
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(term);
        const matchRoom = item.roomCode.toLowerCase().includes(term);
        const matchRoomName = (item.roomName || "").toLowerCase().includes(term);
        const matchDesc = item.description.toLowerCase().includes(term);
        const matchTech = (item.assignedTechnician || "").toLowerCase().includes(term);
        const matchReporter = item.reportedBy.toLowerCase().includes(term);
        const matchEquip = (item.equipmentName || "").toLowerCase().includes(term);
        if (!matchCode && !matchRoom && !matchRoomName && !matchDesc && !matchTech && !matchReporter && !matchEquip) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, roomFilter, statusFilter, categoryFilter, severityFilter, searchTerm]);

  // Paginated List
  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredIncidents.slice(startIndex, startIndex + pageSize);
  }, [filteredIncidents, currentPage, pageSize]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const defaultRoom = dbRooms.find((r) => r.roomCode === "B202") || dbRooms[0];
    setCreateForm({
      targetType: "Phòng",
      roomCode: defaultRoom ? defaultRoom.roomCode : "B202",
      roomId: defaultRoom ? defaultRoom.id : undefined,
      roomName: defaultRoom ? defaultRoom.name : "Phòng học nhóm B202",
      equipmentName: "",
      category: "Thiết bị hư hỏng",
      severity: "Khẩn cấp",
      description: "",
      reportedBy: "Thủ thư trực ca",
      reporterPhone: "",
      assignedTechnician: "",
      setRoomMaintenance: true,
    });
    setShowCreateModal(true);
  };

  // Submit Create Incident
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description.trim()) {
      onNotify("Vui lòng nhập mô tả chi tiết sự cố cần xử lý!", "warning");
      return;
    }

    const created = await createIncident({
      targetType: createForm.targetType,
      roomCode: createForm.roomCode,
      roomId: createForm.roomId,
      roomName: createForm.roomName || `Phòng ${createForm.roomCode}`,
      equipmentName: createForm.equipmentName || undefined,
      category: createForm.category,
      severity: createForm.severity,
      description: createForm.description,
      reportedBy: createForm.reportedBy,
      reporterPhone: createForm.reporterPhone || undefined,
      assignedTechnician: createForm.assignedTechnician || undefined,
      status: createForm.assignedTechnician ? "Đang bảo trì" : "Chờ tiếp nhận",
      setRoomMaintenance: createForm.setRoomMaintenance,
    });

    if (createForm.setRoomMaintenance && createForm.roomId) {
      try {
        await api.patch(`/api/Rooms/${createForm.roomId}/status`, {
          status: "Bảo trì",
          reason: `Sự cố ${created.code}: ${createForm.description}`,
        });
      } catch {
        // Continue
      }
    }

    onNotify(
      `Đã lập phiếu sự cố ${created.code} thành công! Phòng ${created.roomCode} đã được ghi nhận.`,
      "success"
    );
    setShowCreateModal(false);
    loadData();
  };

  // Open Edit / Resolve Modal
  const handleOpenEdit = (incident: IncidentReportItem) => {
    setSelectedIncident(incident);
    setEditForm({
      status: incident.status,
      category: incident.category,
      severity: incident.severity,
      description: incident.description,
      equipmentName: incident.equipmentName || "",
      assignedTechnician: incident.assignedTechnician || "",
      technicianNote: incident.technicianNote || "",
      repairCost: incident.repairCost || 0,
      restoreRoomToAvailable: true,
    });
    setShowEditModal(true);
  };

  // Submit Edit / Resolve
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    const isMarkingResolved = editForm.status === "Đã khắc phục";

    await updateIncident(selectedIncident.id, {
      status: editForm.status,
      category: editForm.category,
      severity: editForm.severity,
      description: editForm.description,
      equipmentName: editForm.equipmentName,
      assignedTechnician: editForm.assignedTechnician,
      technicianNote: editForm.technicianNote,
      repairCost: Number(editForm.repairCost) || 0,
      resolvedBy: isMarkingResolved ? (editForm.assignedTechnician || "Kỹ thuật viên Thư viện") : undefined,
      restoreRoomToAvailable: editForm.restoreRoomToAvailable,
    });

    if (isMarkingResolved && editForm.restoreRoomToAvailable) {
      const restoreRes = await restoreRoomToAvailable(
        selectedIncident.roomId,
        selectedIncident.roomCode
      );
      if (restoreRes.success) {
        onNotify(
          `Đã giải quyết sự cố ${selectedIncident.code} & ${restoreRes.message}`,
          "success"
        );
      } else {
        onNotify(
          `Đã cập nhật sự cố ${selectedIncident.code}. Lưu ý: ${restoreRes.message}`,
          "warning"
        );
      }
    } else {
      onNotify(
        `Đã cập nhật thông tin phiếu sự cố ${selectedIncident.code} thành công!`,
        "success"
      );
    }

    setShowEditModal(false);
    setSelectedIncident(null);
    loadData();
  };

  // 1-Click Quick Resolve & Re-open Room
  const handleQuickResolveAndOpenRoom = async (incident: IncidentReportItem) => {
    const isConfirmed = await confirm({
      title: "Hoàn tất bảo trì & Mở lại phòng",
      message: `Bạn xác nhận sự cố ${incident.code} tại phòng ${incident.roomCode} đã được sửa chữa khắc phục hoàn toàn?`,
      subMessage: `Hệ thống sẽ chuyển trạng thái phòng ${incident.roomCode} từ "Bảo trì" sang "Trống (Sẵn sàng phục vụ)" để tiếp nhận lượt đặt chỗ mới.`,
      itemDetails: [
        { label: "Mã phiếu", value: incident.code },
        { label: "Phòng học", value: `${incident.roomCode} - ${incident.roomName || ""}` },
        { label: "Sự cố ghi nhận", value: incident.description },
        { label: "Kỹ thuật xử lý", value: incident.assignedTechnician || "Kỹ thuật viên phụ trách" },
      ],
      confirmText: "Xác nhận & Mở lại phòng",
      cancelText: "Đóng lại",
      type: "success",
    });

    if (!isConfirmed) return;

    await resolveIncident(incident.id, {
      technicianNote: "Đã hoàn tất kiểm tra, sửa chữa và nghiệm thu vận hành bình thường.",
      resolvedBy: "Kỹ thuật viên Thư viện",
      repairCost: incident.repairCost || 0,
      restoreRoomToAvailable: true,
    });

    const res = await restoreRoomToAvailable(incident.roomId, incident.roomCode);

    if (res.success) {
      onNotify(
        `Thành công! Đã giải quyết sự cố ${incident.code} và đưa phòng ${incident.roomCode} về trạng thái Sẵn sàng phục vụ!`,
        "success"
      );
    } else {
      onNotify(
        `Đã đánh dấu hoàn tất sự cố ${incident.code}. Lưu ý cập nhật phòng: ${res.message}`,
        "warning"
      );
    }

    loadData();
  };

  // Delete Incident
  const handleDeleteIncident = async (incident: IncidentReportItem) => {
    const isConfirmed = await confirm({
      title: "Xác nhận xóa phiếu báo sự cố",
      message: `Bạn có chắc chắn muốn xóa phiếu sự cố ${incident.code} tại phòng ${incident.roomCode}?`,
      subMessage: "Hành động này sẽ xóa vĩnh viễn phiếu ghi nhận sự cố khỏi lịch sử theo dõi.",
      confirmText: "Xóa vĩnh viễn",
      cancelText: "Hủy bỏ",
      type: "warning",
    });

    if (!isConfirmed) return;

    await deleteIncident(incident.id);
    onNotify(`Đã xóa phiếu sự cố ${incident.code}!`, "success");
    loadData();
  };

  return (
    <div className="admin-subtab-container">
      {/* 1. Subtab Header */}
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <WrenchIcon size={24} className="icon-blue-glow" style={{ color: "#d97706" }} />
            Quản lý Báo cáo sự cố & Lịch sử bảo trì
          </h2>
          <p className="admin-subtab-subtitle">
            Theo dõi, xử lý sự cố thiết bị & phòng học phát sinh từ ca trực/trả phòng, phân công kỹ thuật và mở lại phòng sau sửa chữa.
          </p>
        </div>

        <div className="flex-gap-10">
          <button
            type="button"
            className="admin-btn-refresh"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCwIcon size={14} />
            <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
          </button>

          {onSwitchTab && (
            <button
              type="button"
              className="btn-toolbar-secondary flex items-center gap-1.5"
              onClick={() => onSwitchTab("rooms")}
              title="Chuyển sang Quản lý phòng"
              style={{ color: "#00558f" }}
            >
              <DoorIcon size={15} /> Danh sách phòng
            </button>
          )}

          <button
            type="button"
            className="btn-toolbar-primary flex items-center gap-1.5"
            onClick={handleOpenCreate}
          >
            <PlusIcon size={16} /> Lập phiếu sự cố
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards (Grid 4 Columns) */}
      <div className="admin-kpi-grid">
        <div
          className={`kpi-card cursor-pointer ${
            statusFilter === "ALL" ? "stat-active" : ""
          }`}
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          title="Xem toàn bộ phiếu sự cố"
        >
          <div className="kpi-icon-wrap icon-blue">
            <WrenchIcon size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng số phiếu sự cố</span>
            <strong className="kpi-value">{stats.total}</strong>
            <span className="kpi-subtext">Toàn bộ sự cố thiết bị &amp; phòng</span>
          </div>
        </div>

        <div
          className={`kpi-card cursor-pointer ${
            statusFilter === "Chờ tiếp nhận" ? "stat-active" : ""
          }`}
          style={{ borderLeft: "4px solid #f59e0b" }}
          onClick={() => {
            setStatusFilter("Chờ tiếp nhận");
            setCurrentPage(1);
          }}
          title="Lọc các phiếu chờ phân công kỹ thuật"
        >
          <div className="kpi-icon-wrap icon-amber">
            <AlertTriangleIcon size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label color-amber">Chờ tiếp nhận</span>
            <strong className="kpi-value color-amber">{stats.pending}</strong>
            <span className="kpi-subtext">Cần phân công kỹ thuật viên</span>
          </div>
        </div>

        <div
          className={`kpi-card cursor-pointer ${
            statusFilter === "Đang bảo trì" ? "stat-active" : ""
          }`}
          style={{ borderLeft: "4px solid #ea580c" }}
          onClick={() => {
            setStatusFilter("Đang bảo trì");
            setCurrentPage(1);
          }}
          title="Lọc các phiếu đang sửa chữa / bảo trì"
        >
          <div className="kpi-icon-wrap icon-amber" style={{ background: "#ffedd5", color: "#ea580c" }}>
            <WrenchIcon size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label" style={{ color: "#ea580c" }}>Đang bảo trì / Sửa chữa</span>
            <strong className="kpi-value" style={{ color: "#ea580c" }}>{stats.inMaintenance}</strong>
            <span className="kpi-subtext">Phòng đang khóa sửa chữa</span>
          </div>
        </div>

        <div
          className={`kpi-card cursor-pointer ${
            statusFilter === "Đã khắc phục" ? "stat-active" : ""
          }`}
          style={{ borderLeft: "4px solid #16a34a" }}
          onClick={() => {
            setStatusFilter("Đã khắc phục");
            setCurrentPage(1);
          }}
          title="Lọc các phiếu đã khắc phục hoàn tất"
        >
          <div className="kpi-icon-wrap icon-green">
            <CheckCircleIcon size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label color-green">Đã khắc phục / Hoàn tất</span>
            <strong className="kpi-value color-green">{stats.resolved}</strong>
            <span className="kpi-subtext">Đã kiểm tra vận hành sẵn sàng</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã phiếu (#SC...), Phòng (B202...), Thiết bị, Mô tả, KTV..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        <div className="admin-select-filters flex-wrap">
          {/* Room Filter */}
          <select
            className="admin-select-filter"
            value={roomFilter}
            onChange={(e) => {
              setRoomFilter(e.target.value);
              setCurrentPage(1);
            }}
            title="Lọc theo Phòng"
          >
            <option value="ALL">-- Tất cả phòng học --</option>
            {Array.from(new Set(incidents.map((i) => i.roomCode))).map((code) => (
              <option key={code} value={code}>
                Phòng {code}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="admin-select-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            title="Lọc theo Trạng thái"
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
            <option value="Đang bảo trì">Đang bảo trì</option>
            <option value="Đã khắc phục">Đã khắc phục</option>
          </select>

          {/* Category Filter */}
          <select
            className="admin-select-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            title="Lọc theo Phân loại sự cố"
          >
            <option value="ALL">-- Tất cả phân loại sự cố --</option>
            <option value="Thiết bị hư hỏng">Thiết bị hư hỏng</option>
            <option value="Điện / Chiếu sáng / Điều hòa">Điện / Chiếu sáng / Điều hòa</option>
            <option value="Cơ sở vật chất / Bàn ghế">Cơ sở vật chất / Bàn ghế</option>
            <option value="Vệ sinh sâu">Vệ sinh sâu</option>
            <option value="Khác">Khác</option>
          </select>

          {/* Severity Filter */}
          <select
            className="admin-select-filter"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            title="Lọc theo Mức độ nghiêm trọng"
          >
            <option value="ALL">-- Tất cả mức độ --</option>
            <option value="Khẩn cấp">Khẩn cấp (Khóa phòng)</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Nhẹ">Nhẹ</option>
          </select>

          {(searchTerm || statusFilter !== "ALL" || categoryFilter !== "ALL" || severityFilter !== "ALL" || roomFilter !== "ALL") && (
            <button
              type="button"
              className="filter-pill-btn filter-reset-btn"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setSeverityFilter("ALL");
                setRoomFilter("ALL");
                setCurrentPage(1);
              }}
              title="Đặt lại toàn bộ tiêu chí tìm kiếm"
            >
              <RefreshCwIcon size={12} />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Incident Reports Table */}
      {loading ? (
        <div className="table-loading-box">
          <div className="spinner-border" />
          <p>Đang tải danh sách báo cáo sự cố...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="empty-state-card">
          <WrenchIcon size={48} className="empty-icon-muted" />
          <p className="empty-title">
            {incidents.length === 0
              ? "Chưa có báo cáo sự cố nào"
              : "Không tìm thấy báo cáo sự cố nào phù hợp"}
          </p>
          <p className="empty-desc">
            {incidents.length === 0
              ? "Toàn bộ phòng học và thiết bị đang vận hành tốt, không có sự cố nào được ghi nhận."
              : "Không có sự cố nào khớp với bộ lọc hiện tại. Bạn có thể đặt lại bộ lọc hoặc tạo phiếu mới."}
          </p>
          <div className="empty-state-actions flex-gap-10" style={{ marginTop: "14px", display: "flex", justifyContent: "center", gap: "10px" }}>
            {incidents.length === 0 ? (
              <button
                type="button"
                className="btn-toolbar-primary flex items-center gap-1.5"
                onClick={handleOpenCreate}
              >
                <PlusIcon size={14} /> Lập phiếu sự cố mới
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-toolbar-secondary flex items-center gap-1.5"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                    setCategoryFilter("ALL");
                    setSeverityFilter("ALL");
                    setRoomFilter("ALL");
                    setCurrentPage(1);
                  }}
                >
                  <RefreshCwIcon size={13} /> Xóa tất cả bộ lọc
                </button>
                <button
                  type="button"
                  className="btn-toolbar-primary flex items-center gap-1.5"
                  onClick={handleOpenCreate}
                >
                  <PlusIcon size={14} /> Lập phiếu sự cố mới
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-table-responsive">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th style={{ width: "160px" }}>Mã phiếu</th>
                <th style={{ width: "180px" }}>Phòng / Vị trí</th>
                <th style={{ width: "170px" }}>Phân loại & Mức độ</th>
                <th style={{ minWidth: "260px" }}>Mô tả sự cố & Tiến độ kỹ thuật</th>
                <th style={{ width: "180px" }}>Người báo cáo</th>
                <th style={{ width: "140px" }}>Trạng thái</th>
                <th style={{ width: "90px", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIncidents.map((incident) => {
                const isResolved = incident.status === "Đã khắc phục";
                const isInMaintenance = incident.status === "Đang bảo trì";

                const severityBadgeClass =
                  incident.severity === "Khẩn cấp"
                    ? "severity-pill-danger"
                    : incident.severity === "Trung bình"
                    ? "severity-pill-warning"
                    : "severity-pill-info";

                const statusBadgeClass = isResolved
                  ? "pill-approved"
                  : isInMaintenance
                  ? "pill-maintenance"
                  : "pill-pending";

                return (
                  <tr
                    key={incident.id}
                    className="clickable-row"
                    onClick={() => handleOpenEdit(incident)}
                  >
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="room-code-badge-lg font-mono" style={{ fontSize: "13px" }}>
                        {incident.code}
                      </span>
                      <div className="text-xs text-muted" style={{ marginTop: "4px" }}>
                        {formatDateTime24h(incident.reportedAt)}
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5 font-bold text-dark">
                        <DoorIcon size={15} style={{ color: "#2563eb" }} />
                        <span>Phòng {incident.roomCode}</span>
                      </div>
                      {incident.equipmentName && (
                        <div className="text-xs text-muted flex items-center gap-1" style={{ marginTop: "4px" }}>
                          <TvIcon size={12} />
                          <span>{incident.equipmentName}</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="font-semibold text-xs text-dark" style={{ marginBottom: "6px" }}>
                        {incident.category}
                      </div>
                      <span className={`admin-status-pill ${severityBadgeClass}`}>
                        {incident.severity === "Khẩn cấp" && <AlertTriangleIcon size={11} />}
                        {incident.severity}
                      </span>
                    </td>

                    <td style={{ maxWidth: "340px" }}>
                      <div style={{ fontSize: "13.5px", lineHeight: "1.45", color: "#1e293b" }}>
                        {incident.description}
                      </div>

                      {incident.technicianNote && (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "6px 10px",
                            background: "#eff6ff",
                            borderLeft: "3px solid #3b82f6",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#1e40af",
                          }}
                        >
                          <strong>KTV ({incident.assignedTechnician || "Phụ trách"}):</strong> {incident.technicianNote}
                          {incident.repairCost ? (
                            <span style={{ marginLeft: "8px", fontWeight: 600, color: "#b91c1c" }}>
                              • Chi phí: {incident.repairCost.toLocaleString("vi-VN")}đ
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <div className="text-sm font-semibold text-dark">{incident.reportedBy}</div>
                      {incident.reporterPhone && (
                        <div className="text-xs text-muted" style={{ marginTop: "2px" }}>
                          SĐT: {incident.reporterPhone}
                        </div>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className={`admin-status-pill ${statusBadgeClass}`}>
                        {isResolved ? (
                          <CheckIcon size={12} />
                        ) : isInMaintenance ? (
                          <WrenchIcon size={12} />
                        ) : (
                          <AlertTriangleIcon size={12} />
                        )}
                        {incident.status}
                      </span>
                    </td>

                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className={`btn-table-more ${rowMenu?.key === incident.id ? "active" : ""}`}
                          title="Thao tác"
                          aria-label="Thao tác"
                          onClick={(e) => toggleRowMenu(incident.id, e.currentTarget)}
                        >
                          <DotsIcon size={17} />
                        </button>

                        {rowMenu?.key === incident.id &&
                          createPortal(
                            <div
                              ref={rowMenuRef}
                              className={`row-actions-menu ${rowMenu.openUp ? "open-up" : ""}`}
                              style={{ top: rowMenu.top, left: rowMenu.left }}
                              role="menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                className="row-actions-menu-item accent-blue"
                                onClick={() => {
                                  setRowMenu(null);
                                  handleOpenEdit(incident);
                                }}
                              >
                                <PencilIcon size={14} />
                                <span>Chỉnh sửa / Cập nhật tiến độ</span>
                              </button>

                              {!isResolved && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-indigo"
                                  onClick={() => {
                                    setRowMenu(null);
                                    handleQuickResolveAndOpenRoom(incident);
                                  }}
                                >
                                  <CheckCircleIcon size={14} />
                                  <span>Khắc phục & Mở lại phòng</span>
                                </button>
                              )}

                              <button
                                type="button"
                                role="menuitem"
                                className="row-actions-menu-item danger"
                                onClick={() => {
                                  setRowMenu(null);
                                  handleDeleteIncident(incident);
                                }}
                              >
                                <TrashIcon size={14} />
                                <span>Xóa phiếu sự cố</span>
                              </button>
                            </div>,
                            document.body
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredIncidents.length > 0 && (
            <AdminPagination
              currentPage={currentPage}
              totalItems={filteredIncidents.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              itemLabel="phiếu sự cố"
            />
          )}
        </div>
      )}

      {/* ── MODAL 1: CREATE INCIDENT ── */}
      {showCreateModal && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="admin-modal-box modal-medium">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <WrenchIcon size={20} style={{ color: "#d97706" }} />
                <h3 className="modal-title">Lập phiếu báo cáo sự cố & Đưa phòng vào bảo trì</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="admin-modal-form-wrap">
              <div className="modal-body-scrollable">
                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="admin-field-label">Đối tượng sự cố *</label>
                    <div className="flex gap-4" style={{ marginTop: "6px" }}>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="targetType"
                          value="Phòng"
                          checked={createForm.targetType === "Phòng"}
                          onChange={() => setCreateForm({ ...createForm, targetType: "Phòng" })}
                        />
                        <span>Phòng học</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="targetType"
                          value="Thiết bị"
                          checked={createForm.targetType === "Thiết bị"}
                          onChange={() => setCreateForm({ ...createForm, targetType: "Thiết bị" })}
                        />
                        <span>Thiết bị cụ thể</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="admin-field-label">Phòng học liên quan *</label>
                    <select
                      className="admin-input-text"
                      value={createForm.roomCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const room = dbRooms.find((r) => r.roomCode === code);
                        setCreateForm({
                          ...createForm,
                          roomCode: code,
                          roomId: room?.id,
                          roomName: room?.name || `Phòng ${code}`,
                        });
                      }}
                      required
                    >
                      {dbRooms.length > 0 ? (
                        dbRooms.map((r) => (
                          <option key={r.id} value={r.roomCode}>
                            {r.roomCode} - {r.name} ({r.status})
                          </option>
                        ))
                      ) : (
                        <option value="B202">B202 - Phòng học nhóm B202</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="admin-field-label">Phân loại sự cố *</label>
                    <select
                      className="admin-input-text"
                      value={createForm.category}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          category: e.target.value as IncidentCategory,
                        })
                      }
                    >
                      <option value="Thiết bị hư hỏng">Thiết bị hư hỏng (Máy chiếu, cáp HDMI, micro...)</option>
                      <option value="Điện / Chiếu sáng / Điều hòa">Điện / Chiếu sáng / Điều hòa</option>
                      <option value="Cơ sở vật chất / Bàn ghế">Cơ sở vật chất / Bàn ghế / Cửa</option>
                      <option value="Vệ sinh sâu">Vệ sinh sâu / Mùi hôi / Nước đổ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="admin-field-label">Mức độ nghiêm trọng *</label>
                    <select
                      className="admin-input-text"
                      value={createForm.severity}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          severity: e.target.value as IncidentSeverity,
                        })
                      }
                    >
                      <option value="Khẩn cấp">Khẩn cấp (Khóa phòng bảo trì ngay)</option>
                      <option value="Trung bình">Trung bình (Xử lý trong ca)</option>
                      <option value="Nhẹ">Nhẹ (Bảo trì định kỳ)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="admin-field-label">Tên thiết bị hư hại (nếu có)</label>
                  <input
                    type="text"
                    className="admin-input-text"
                    placeholder="Ví dụ: Máy chiếu Sony VPL, Dây cáp HDMI 10m, Điều hòa 2HP..."
                    value={createForm.equipmentName}
                    onChange={(e) => setCreateForm({ ...createForm, equipmentName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-field-label">Mô tả chi tiết sự cố *</label>
                  <textarea
                    rows={3}
                    className="admin-input-text"
                    placeholder="Mô tả cụ thể hiện trạng hỏng hóc, triệu chứng để kỹ thuật viên nắm thông tin xử lý..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="admin-field-label">Người báo cáo / Thủ thư trực ca</label>
                    <input
                      type="text"
                      className="admin-input-text"
                      value={createForm.reportedBy}
                      onChange={(e) => setCreateForm({ ...createForm, reportedBy: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="admin-field-label">Phân công kỹ thuật viên (tùy chọn)</label>
                    <input
                      type="text"
                      className="admin-input-text"
                      placeholder="Ví dụ: KTV. Nguyễn Thanh Tùng"
                      value={createForm.assignedTechnician}
                      onChange={(e) => setCreateForm({ ...createForm, assignedTechnician: e.target.value })}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid #fcd34d",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "6px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="setRoomMaintenance"
                    checked={createForm.setRoomMaintenance}
                    onChange={(e) => setCreateForm({ ...createForm, setRoomMaintenance: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="setRoomMaintenance" style={{ margin: 0, cursor: "pointer", fontSize: "13px" }}>
                    <strong>Đồng thời chuyển trạng thái phòng {createForm.roomCode} sang "Bảo trì"</strong>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      Phòng sẽ tạm ngừng cho sinh viên đặt mới cho đến khi hoàn tất sửa chữa.
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer-pinned">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn-confirm-save flex items-center gap-1.5">
                  <PlusIcon size={14} /> Tạo phiếu sự cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT / RESOLVE INCIDENT ── */}
      {showEditModal && selectedIncident && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="admin-modal-box modal-medium">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <WrenchIcon size={20} style={{ color: "#2563eb" }} />
                <h3 className="modal-title">Cập nhật tiến độ sự cố [{selectedIncident.code}]</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditModal(false)}
                title="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="admin-modal-form-wrap">
              <div className="modal-body-scrollable">
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--color-bg-secondary, #f8fafc)",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border, #e2e8f0)",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Phòng học</div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {selectedIncident.roomCode} ({selectedIncident.roomName})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Người báo cáo</div>
                    <div style={{ fontWeight: 500, fontSize: "13px" }}>{selectedIncident.reportedBy}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Thời gian báo</div>
                    <div style={{ fontWeight: 500, fontSize: "13px" }}>
                      {formatDateTime24h(selectedIncident.reportedAt)}
                    </div>
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="admin-field-label">Trạng thái tiến độ *</label>
                    <select
                      className="admin-input-text"
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value as IncidentStatus,
                        })
                      }
                    >
                      <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
                      <option value="Đang bảo trì">Đang bảo trì / Đang sửa chữa</option>
                      <option value="Đã khắc phục">Đã khắc phục / Hoàn tất</option>
                      <option value="Hủy bỏ">Hủy bỏ / Báo sai</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="admin-field-label">Kỹ thuật viên phụ trách</label>
                    <input
                      type="text"
                      className="admin-input-text"
                      placeholder="Tên kỹ thuật viên xử lý..."
                      value={editForm.assignedTechnician}
                      onChange={(e) => setEditForm({ ...editForm, assignedTechnician: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-form-grid-2">
                  <div className="form-group">
                    <label className="admin-field-label">Mức độ nghiêm trọng</label>
                    <select
                      className="admin-input-text"
                      value={editForm.severity}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          severity: e.target.value as IncidentSeverity,
                        })
                      }
                    >
                      <option value="Khẩn cấp">Khẩn cấp</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Nhẹ">Nhẹ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="admin-field-label">Chi phí sửa chữa / Thay thế (VNĐ)</label>
                    <input
                      type="number"
                      className="admin-input-text"
                      placeholder="0"
                      min={0}
                      step={10000}
                      value={editForm.repairCost}
                      onChange={(e) => setEditForm({ ...editForm, repairCost: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="admin-field-label">Mô tả sự cố ban đầu</label>
                  <textarea
                    rows={2}
                    className="admin-input-text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-field-label">Biên bản nghiệm thu & Ghi chú của Kỹ thuật viên</label>
                  <textarea
                    rows={3}
                    className="admin-input-text"
                    placeholder="Ghi nhận phương án khắc phục, linh kiện đã thay thế, kết quả chạy thử nghiệm..."
                    value={editForm.technicianNote}
                    onChange={(e) => setEditForm({ ...editForm, technicianNote: e.target.value })}
                  />
                </div>

                {editForm.status === "Đã khắc phục" && (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid #86efac",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="restoreRoomToAvailable"
                      checked={editForm.restoreRoomToAvailable}
                      onChange={(e) => setEditForm({ ...editForm, restoreRoomToAvailable: e.target.checked })}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="restoreRoomToAvailable" style={{ margin: 0, cursor: "pointer", fontSize: "13px" }}>
                      <strong className="text-success">
                        Tự động đưa phòng {selectedIncident.roomCode} về trạng thái "Trống" (Sẵn sàng phục vụ)
                      </strong>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>
                        Hệ thống sẽ mở lại phòng trên lịch đặt chỗ để sinh viên và giảng viên có thể đặt phòng bình thường.
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer-pinned">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Đóng lại
                </button>
                <button type="submit" className="btn-confirm-save flex items-center gap-1.5">
                  <CheckIcon size={14} /> Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
