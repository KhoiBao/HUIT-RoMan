import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  fetchShifts,
  createShift,
  updateShift,
  deleteShift,
  updateShiftStatus,
  fetchShiftLogs,
  createShiftLog,
  fetchMyShifts,
  fetchShiftStats,
  type ShiftItem,
  type ShiftLogItem,
  type ShiftStats,
} from "../../lib/shifts";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import {
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  BriefcaseIcon,
  CalendarIcon,
  TableIcon,
  FileTextIcon,
  PersonIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  AlertTriangleIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";

interface AdminShiftsTabProps {
  onNotify?: (text: string, type?: "success" | "warning" | "info") => void;
}

interface EmployeeItem {
  id: number;
  code: string;
  fullName: string;
  email: string;
  position: string;
  departmentName?: string;
}

export default function AdminShiftsTab({ onNotify }: AdminShiftsTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "quan-tri" || user?.role === "Quản trị viên";
  const { confirm } = useConfirm();

  // Data states
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [logs, setLogs] = useState<ShiftLogItem[]>([]);
  const [stats, setStats] = useState<ShiftStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View state: "calendar" | "table"
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [showMyShiftsOnly, setShowMyShiftsOnly] = useState<boolean>(false);

  // Filters
  const [dateFilterType, setDateFilterType] = useState<"this-week" | "today" | "next-week" | "all">("this-week");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);

  // Shift Form state
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    name: "Ca Sáng - Quản lý phòng & Tiếp nhận mượn",
    startTime: "07:00",
    endTime: "11:30",
    status: "Lên lịch",
    selectedEmployeeIds: [] as number[],
  });

  // Log Form state
  const [logForm, setLogForm] = useState({
    content: "",
    type: 1, // 1: Bàn giao ca, 2: Sự cố phát sinh, 3: Kiểm tra vệ sinh/an ninh
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate current week boundaries
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  // Load shifts and related data
  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsData, logsData, statsData, empRes] = await Promise.all([
        showMyShiftsOnly ? fetchMyShifts() : fetchShifts(),
        fetchShiftLogs(),
        fetchShiftStats(),
        api.get("/api/Employees").catch(() => ({ data: [] })),
      ]);

      setShifts(shiftsData);
      setLogs(logsData);
      setStats(statsData);

      const empList = empRes.data?.data || empRes.data || [];
      setEmployees(empList);
    } catch (err: unknown) {
      console.error("Lỗi tải lịch trực:", err);
      onNotify?.("Không thể tải dữ liệu lịch trực lúc này.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showMyShiftsOnly]);

  // Filtered shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      // Status filter
      if (statusFilter !== "ALL" && s.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchEmp = s.employees.some(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q)
        );
        if (!matchName && !matchEmp) return false;
      }

      // Date quick filter
      const shiftDateStr = s.dateString || s.date.slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);

      if (dateFilterType === "today") {
        return shiftDateStr === todayStr;
      } else if (dateFilterType === "this-week") {
        const monStr = currentWeekDays[0].toISOString().slice(0, 10);
        const sunStr = currentWeekDays[6].toISOString().slice(0, 10);
        return shiftDateStr >= monStr && shiftDateStr <= sunStr;
      } else if (dateFilterType === "next-week") {
        const nextMon = new Date(currentWeekDays[0]);
        nextMon.setDate(nextMon.getDate() + 7);
        const nextSun = new Date(currentWeekDays[6]);
        nextSun.setDate(nextSun.getDate() + 7);
        const monStr = nextMon.toISOString().slice(0, 10);
        const sunStr = nextSun.toISOString().slice(0, 10);
        return shiftDateStr >= monStr && shiftDateStr <= sunStr;
      }

      return true;
    });
  }, [shifts, statusFilter, searchQuery, dateFilterType, currentWeekDays]);

  // Open modal create
  const handleOpenCreateModal = () => {
    setEditingShift(null);
    setShiftForm({
      date: new Date().toISOString().slice(0, 10),
      name: "Ca Sáng - Tiếp nhận mượn & Quản lý phòng",
      startTime: "07:00",
      endTime: "11:30",
      status: "Lên lịch",
      selectedEmployeeIds: employees.length > 0 ? [employees[0].id] : [],
    });
    setIsShiftModalOpen(true);
  };

  // Open modal edit
  const handleOpenEditModal = (shift: ShiftItem) => {
    setEditingShift(shift);
    setShiftForm({
      date: shift.dateString || shift.date.slice(0, 10),
      name: shift.name,
      startTime: shift.startTime.slice(0, 5),
      endTime: shift.endTime.slice(0, 5),
      status: shift.status,
      selectedEmployeeIds: shift.employees.map((e) => e.id),
    });
    setIsShiftModalOpen(true);
  };

  // Submit create or update shift
  const handleSaveShift = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingShift) {
        await updateShift(editingShift.id, {
          date: shiftForm.date,
          name: shiftForm.name,
          startTime: `${shiftForm.startTime}:00`,
          endTime: `${shiftForm.endTime}:00`,
          status: shiftForm.status,
          employeeIds: shiftForm.selectedEmployeeIds,
        });
        onNotify?.(`Cập nhật ca trực "${shiftForm.name}" thành công!`, "success");
      } else {
        await createShift({
          date: shiftForm.date,
          name: shiftForm.name,
          startTime: `${shiftForm.startTime}:00`,
          endTime: `${shiftForm.endTime}:00`,
          status: shiftForm.status,
          employeeIds: shiftForm.selectedEmployeeIds,
        });
        onNotify?.(`Khởi tạo ca trực mới ngày ${shiftForm.date} thành công!`, "success");
      }
      setIsShiftModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Lưu ca trực thất bại.";
      onNotify?.(msg, "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete shift
  const handleDeleteShift = async (shift: ShiftItem) => {
    const confirmed = await confirm({
      title: "Xác nhận xóa ca trực",
      message: `Bạn có chắc chắn muốn xóa ca trực "${shift.name}"?`,
      subMessage: "Ca trực và các phân công nhân viên liên quan sẽ bị xóa vĩnh viễn khỏi lịch.",
      itemDetails: [
        { label: "Tên ca trực", value: shift.name },
        { label: "Ngày trực", value: shift.dateString },
        { label: "Thời gian", value: `${shift.startTime} - ${shift.endTime}` },
        { label: "Trạng thái", value: shift.status },
      ],
      type: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
    });
    if (!confirmed) return;

    try {
      await deleteShift(shift.id);
      onNotify?.(`Đã xóa ca trực #${shift.id}`, "info");
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể xóa ca trực.";
      onNotify?.(msg, "warning");
    }
  };

  // Update shift status (Start shift / Complete shift)
  const handleChangeStatus = async (shift: ShiftItem, newStatus: string) => {
    try {
      await updateShiftStatus(shift.id, newStatus);
      onNotify?.(`Ca trực "${shift.name}" đã chuyển sang trạng thái "${newStatus}"!`, "success");
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Cập nhật trạng thái thất bại.";
      onNotify?.(msg, "warning");
    }
  };

  // Submit Shift Log
  const handleSaveLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logForm.content.trim()) return;

    setIsSubmitting(true);
    try {
      await createShiftLog({
        content: logForm.content.trim(),
        type: Number(logForm.type),
      });
      onNotify?.("Ghi nhận nhật ký ca trực thành công!", "success");
      setLogForm({ content: "", type: 1 });
      setIsLogModalOpen(false);
      const updatedLogs = await fetchShiftLogs();
      setLogs(updatedLogs);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Không thể lưu nhật ký ca trực.";
      onNotify?.(msg, "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle employee selection
  const handleToggleEmployee = (empId: number) => {
    setShiftForm((prev) => {
      const exists = prev.selectedEmployeeIds.includes(empId);
      if (exists) {
        return {
          ...prev,
          selectedEmployeeIds: prev.selectedEmployeeIds.filter((id) => id !== empId),
        };
      } else {
        return {
          ...prev,
          selectedEmployeeIds: [...prev.selectedEmployeeIds, empId],
        };
      }
    });
  };

  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  return (
    <div className="admin-shifts-container">
      {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
      <div className="admin-kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-icon-wrap">
            <ClockIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng ca trực</span>
            <strong className="kpi-value">{stats?.totalShifts || 0}</strong>
            <span className="kpi-sub">
              {stats?.totalAssignedEmployees || 0} nhân sự được phân công
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-orange">
          <div className="kpi-icon-wrap">
            <span className="live-pulse-dot" style={{ width: 14, height: 14 }} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ca đang diễn ra</span>
            <strong className="kpi-value">{stats?.inProgressShifts || 0}</strong>
            <span className="kpi-sub">Giám sát &amp; Trực tại chỗ</span>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-icon-wrap">
            <CheckCircleIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Ca đã hoàn thành</span>
            <strong className="kpi-value">{stats?.completedShifts || 0}</strong>
            <span className="kpi-sub">Bàn giao ca đầy đủ</span>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-icon-wrap">
            <BriefcaseIcon size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Nhật ký trực ghi nhận</span>
            <strong className="kpi-value">{stats?.totalLogs || 0}</strong>
            <span className="kpi-sub">Bàn giao &amp; Ghi chú sự cố</span>
          </div>
        </div>
      </div>

      {/* ── 2. Filter & Actions Toolbar ──────────────────────────────────── */}
      <div className="table-filter-bar">
        <div className="search-input-wrap">
          <SearchIcon size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo tên ca hoặc nhân sự trực..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Segment */}
        <div className="btn-group-segmented">
          <button
            type="button"
            className={`seg-item-btn ${dateFilterType === "this-week" ? "active" : ""}`}
            onClick={() => setDateFilterType("this-week")}
          >
            Tuần này
          </button>
          <button
            type="button"
            className={`seg-item-btn ${dateFilterType === "today" ? "active" : ""}`}
            onClick={() => setDateFilterType("today")}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className={`seg-item-btn ${dateFilterType === "next-week" ? "active" : ""}`}
            onClick={() => setDateFilterType("next-week")}
          >
            Tuần sau
          </button>
          <button
            type="button"
            className={`seg-item-btn ${dateFilterType === "all" ? "active" : ""}`}
            onClick={() => setDateFilterType("all")}
          >
            Tất cả
          </button>
        </div>

        {/* Status Filter */}
        <div className="filter-item">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đang trực">Đang trực</option>
            <option value="Lên lịch">Lên lịch</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Hủy">Đã hủy</option>
          </select>
        </div>

        {/* View Switcher & Action Buttons */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="btn-group-segmented">
            <button
              type="button"
              className={`seg-item-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => setViewMode("calendar")}
              title="Xem theo Lịch tuần"
            >
              <CalendarIcon size={14} />
              <span>Lịch tuần</span>
            </button>
            <button
              type="button"
              className={`seg-item-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Xem danh sách chi tiết"
            >
              <TableIcon size={14} />
              <span>Bảng biểu</span>
            </button>
          </div>

          {user?.role === "Employee" && (
            <button
              type="button"
              className={`admin-view-btn ${showMyShiftsOnly ? "active" : ""}`}
              onClick={() => setShowMyShiftsOnly((prev) => !prev)}
            >
              <PersonIcon size={14} />
              <span>Lịch của tôi</span>
            </button>
          )}

          <button
            type="button"
            className="btn-toolbar-secondary"
            onClick={() => setIsLogModalOpen(true)}
          >
            <FileTextIcon size={14} />
            <span>Ghi nhật ký trực</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn-toolbar-primary"
              onClick={handleOpenCreateModal}
              title="Quản lý toàn quyền thiết lập và phân công ca trực mới"
            >
              <PlusIcon size={16} />
              <span>Phân ca trực mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Main Views (Calendar vs Table) ─────────────────────────────── */}
      {loading ? (
        <div className="table-loading-box">
          <span>Đang tải thông tin lịch trực nhân sự HUIT...</span>
        </div>
      ) : viewMode === "calendar" ? (
        /* Calendar Week View */
        <div
          className="shift-calendar-week"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(172px, 1fr))",
            gap: "10px",
            overflowX: "auto",
            marginTop: "16px",
            marginBottom: "24px",
          }}
        >
          {currentWeekDays.map((day, idx) => {
            const dateStr = day.toISOString().slice(0, 10);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const dayShifts = filteredShifts.filter(
              (s) => (s.dateString || s.date.slice(0, 10)) === dateStr
            );

            return (
              <div
                key={dateStr}
                style={{
                  background: isToday ? "#eff6ff" : "#ffffff",
                  border: isToday ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "12px 10px",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "360px",
                  boxShadow: isToday ? "0 4px 12px rgba(59, 130, 246, 0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Day Header */}
                <div
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "8px",
                    marginBottom: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: isToday ? "#1d4ed8" : "#64748b",
                      }}
                    >
                      {dayNames[idx]}
                    </span>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: isToday ? "#1e40af" : "#1e293b",
                      }}
                    >
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </div>
                  {isToday && (
                    <span
                      style={{
                        fontSize: "11px",
                        background: "#3b82f6",
                        color: "#fff",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: 700,
                      }}
                    >
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Shift cards for this day */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  {dayShifts.length === 0 ? (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        textAlign: "center",
                        marginTop: "40px",
                        fontStyle: "italic",
                      }}
                    >
                      Chưa có ca trực
                    </div>
                  ) : (
                    dayShifts.map((s) => {
                      const isMorning = s.startTime.startsWith("07") || s.startTime.startsWith("08");
                      const isEvening = s.startTime.startsWith("17") || s.startTime.startsWith("18");

                      return (
                        <div
                          key={s.id}
                          style={{
                            background: isMorning ? "#f0fdf4" : isEvening ? "#faf5ff" : "#fffbeb",
                            border: `1px solid ${
                              isMorning ? "#bbf7d0" : isEvening ? "#e9d5ff" : "#fef08a"
                            }`,
                            borderRadius: "8px",
                            padding: "9px",
                            fontSize: "12px",
                            position: "relative",
                          }}
                        >
                          {/* Shift Header & Status */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                              gap: "4px 6px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: "11.5px",
                                whiteSpace: "nowrap",
                                color: isMorning ? "#15803d" : isEvening ? "#6b21a8" : "#b45309",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <ClockIcon size={12} />
                              <span>{s.timeRange || `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`}</span>
                            </span>
                            <span
                              style={{
                                fontSize: "10.5px",
                                padding: "2px 5px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                background:
                                  s.status === "Đang trực"
                                    ? "#fee2e2"
                                    : s.status === "Hoàn thành"
                                    ? "#dcfce7"
                                    : "#f1f5f9",
                                color:
                                  s.status === "Đang trực"
                                    ? "#b91c1c"
                                    : s.status === "Hoàn thành"
                                    ? "#15803d"
                                    : "#475569",
                              }}
                            >
                              {s.status === "Đang trực" ? "• Đang trực" : s.status}
                            </span>
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              color: "#1e293b",
                              marginBottom: "6px",
                              lineHeight: "1.3",
                            }}
                          >
                            {s.name}
                          </div>

                          {/* Assigned Employees */}
                          <div style={{ marginTop: "4px" }}>
                            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                              Nhân sự trực:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {s.employees.length === 0 ? (
                                <span style={{ color: "#ef4444", fontSize: "11px", fontStyle: "italic", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                  <AlertTriangleIcon size={12} />
                                  <span>Chưa phân công</span>
                                </span>
                              ) : (
                                s.employees.map((e) => (
                                  <span
                                    key={e.id}
                                    style={{
                                      background: "#ffffff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "12px",
                                      padding: "1px 6px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      color: "#334155",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                    title={`${e.fullName} (${e.code}) - ${e.position}`}
                                  >
                                    <PersonIcon size={12} />
                                    <span>{e.fullName}</span>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div
                            style={{
                              marginTop: "8px",
                              paddingTop: "6px",
                              borderTop: "1px dashed rgba(0,0,0,0.1)",
                              display: "flex",
                              gap: "4px",
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
                            {s.status === "Lên lịch" && (
                              <button
                                type="button"
                                style={{
                                  fontSize: "10.5px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#0284c7",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                onClick={() => handleChangeStatus(s, "Đang trực")}
                                title="Bắt đầu ca trực"
                              >
                                <PlayIcon size={10} />
                                <span>Bắt đầu</span>
                              </button>
                            )}
                            {s.status === "Đang trực" && (
                              <button
                                type="button"
                                style={{
                                  fontSize: "10.5px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#16a34a",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                onClick={() => handleChangeStatus(s, "Hoàn thành")}
                                title="Bàn giao & Hoàn tất ca trực"
                              >
                                <CheckIcon size={11} />
                                <span>Hoàn tất</span>
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  style={{
                                    fontSize: "10.5px",
                                    padding: "3px 6px",
                                    borderRadius: "4px",
                                    background: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: "#475569",
                                  }}
                                  onClick={() => handleOpenEditModal(s)}
                                  title="Chỉnh sửa ca trực"
                                >
                                  <PencilIcon size={12} />
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    fontSize: "10.5px",
                                    padding: "3px 6px",
                                    borderRadius: "4px",
                                    background: "#fff1f2",
                                    border: "1px solid #fecdd3",
                                    color: "#e11d48",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                  onClick={() => handleDeleteShift(s)}
                                  title="Xóa ca trực"
                                >
                                  <TrashIcon size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="table-responsive-wrapper" style={{ marginTop: "16px", marginBottom: "24px" }}>
          <table className="admin-custom-table">
            <thead>
              <tr>
                <th style={{ width: "115px" }}>Ngày trực</th>
                <th style={{ width: "130px" }}>Khung giờ</th>
                <th style={{ minWidth: "180px" }}>Tên ca trực &amp; Nhiệm vụ</th>
                <th style={{ minWidth: "220px" }}>Nhân sự phân công</th>
                <th style={{ width: "140px", textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: "230px", textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                    Không tìm thấy ca trực nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: "#1e293b" }}>
                        {new Date(s.date).toLocaleDateString("vi-VN")}
                      </strong>
                    </td>
                    <td>
                      <span className="font-mono bold color-blue" style={{ fontSize: "12.5px" }}>
                        {s.timeRange || `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                        {s.employees.length === 0 ? (
                          <span style={{ color: "#ef4444", fontStyle: "italic", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <AlertTriangleIcon size={13} />
                            <span>Chưa phân công nhân viên</span>
                          </span>
                        ) : (
                          s.employees.map((e) => (
                            <span
                              key={e.id}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                padding: "3px 9px",
                                borderRadius: "14px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "#1e293b",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                              }}
                              title={`${e.fullName} (${e.code}) - ${e.position}`}
                            >
                              <PersonIcon size={12} className="color-blue" />
                              <span>{e.fullName}</span>
                              <span style={{ color: "#0284c7", fontWeight: 600, fontSize: "11px" }}>({e.code})</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {s.status === "Đang trực" ? (
                        <span className="status-badge badge-in-use">
                          <span className="status-dot in-use-pulse" />
                          <span>Đang trực</span>
                        </span>
                      ) : s.status === "Hoàn thành" ? (
                        <span className="status-badge badge-completed">
                          <CheckCircleIcon size={13} />
                          <span>Hoàn thành</span>
                        </span>
                      ) : s.status === "Hủy" ? (
                        <span className="status-badge badge-cancelled">
                          <span>Đã hủy</span>
                        </span>
                      ) : (
                        <span className="status-badge badge-scheduled">
                          <ClockIcon size={13} />
                          <span>Lên lịch</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        {s.status === "Lên lịch" && (
                          <button
                            type="button"
                            className="btn-shift-action btn-shift-start"
                            onClick={() => handleChangeStatus(s, "Đang trực")}
                            title="Bắt đầu ca trực"
                          >
                            <PlayIcon size={11} />
                            <span>Bắt đầu</span>
                          </button>
                        )}
                        {s.status === "Đang trực" && (
                          <button
                            type="button"
                            className="btn-shift-action btn-shift-complete"
                            onClick={() => handleChangeStatus(s, "Hoàn thành")}
                            title="Hoàn tất ca trực"
                          >
                            <CheckIcon size={12} />
                            <span>Hoàn tất</span>
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="btn-shift-action btn-shift-edit"
                              onClick={() => handleOpenEditModal(s)}
                              title="Chỉnh sửa ca trực"
                            >
                              <PencilIcon size={12} />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              className="btn-shift-action btn-shift-delete"
                              onClick={() => handleDeleteShift(s)}
                              title="Xóa ca trực"
                            >
                              <TrashIcon size={12} />
                              <span>Xóa</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. Shift Handover & Incident Logs Section ─────────────────────── */}
      <div
        className="profile-section-card"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "20px",
          marginTop: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FileTextIcon size={18} />
              <span>NHẬT KÝ BÀN GIAO CA &amp; GHI CHÚ TRỰC THƯ VIỆN</span>
            </h3>
            <span style={{ fontSize: "12.5px", color: "#64748b" }}>
              Lưu trữ biên bản bàn giao chìa khóa, sự cố thiết bị và tình hình vệ sinh an ninh theo ca.
            </span>
          </div>
          <button
            type="button"
            className="btn-toolbar-primary"
            onClick={() => setIsLogModalOpen(true)}
            style={{ padding: "6px 14px", fontSize: "13px" }}
          >
            <PlusIcon size={14} />
            <span>Thêm ghi chép</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
            Chưa có ghi chép nhật ký nào trong hệ thống.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {logs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    background:
                      log.type === 1 ? "#dbeafe" : log.type === 2 ? "#fee2e2" : "#fef3c7",
                    color:
                      log.type === 1 ? "#1e40af" : log.type === 2 ? "#991b1b" : "#92400e",
                  }}
                >
                  {log.typeText}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13.5px", color: "#1e293b", lineHeight: "1.4" }}>
                    {log.content}
                  </div>
                  <div style={{ marginTop: "4px", fontSize: "11.5px", color: "#64748b" }}>
                    Người ghi: <strong>{log.employeeName}</strong> ({log.employeeCode}) • Thời gian:{" "}
                    {new Date(log.logTime).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Modal: Create / Edit Shift ─────────────────────────────────── */}
      {isShiftModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingShift ? "CHỈNH SỬA CA TRỰC" : "PHÂN CA TRỰC NHÂN SỰ MỚI"}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsShiftModalOpen(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="modal-form">
              <div className="form-field">
                <label>
                  Tên ca trực / Nhiệm vụ: <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ca Sáng - Tiếp nhận mượn & Quản lý phòng"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div className="form-field" style={{ minWidth: 0 }}>
                  <label>
                    Ngày trực: <span className="req-star">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                  />
                </div>

                <div className="form-field" style={{ minWidth: 0 }}>
                  <label>
                    Giờ bắt đầu: <span className="req-star">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  />
                </div>

                <div className="form-field" style={{ minWidth: 0 }}>
                  <label>
                    Giờ kết thúc: <span className="req-star">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Trạng thái ca trực:</label>
                <select
                  value={shiftForm.status}
                  onChange={(e) => setShiftForm({ ...shiftForm, status: e.target.value })}
                >
                  <option value="Lên lịch">Lên lịch</option>
                  <option value="Đang trực">Đang trực</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Hủy">Đã hủy</option>
                </select>
              </div>

              {/* Multi-employee selection */}
              <div className="form-field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    Phân công nhân sự trực: <span className="req-star">*</span>
                  </span>
                  <span style={{ fontSize: "12px", color: "#0284c7", fontWeight: 600 }}>
                    Đã chọn: {shiftForm.selectedEmployeeIds.length} nhân viên
                  </span>
                </label>
                <div
                  style={{
                    maxHeight: "190px",
                    overflowY: "auto",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "#f8fafc",
                  }}
                >
                  {employees.map((emp) => {
                    const isChecked = shiftForm.selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: isChecked ? "#f0f9ff" : "#ffffff",
                          border: `1.5px solid ${isChecked ? "#0284c7" : "#e2e8f0"}`,
                          cursor: "pointer",
                          fontSize: "13px",
                          userSelect: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEmployee(emp.id)}
                          style={{
                            width: "16px",
                            height: "16px",
                            minWidth: "16px",
                            margin: 0,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {emp.fullName}
                          </span>
                          <span style={{ color: "#0284c7", fontSize: "12px", fontWeight: 600 }}>
                            ({emp.code})
                          </span>
                          <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "auto" }}>
                            — {emp.position || "Nhân viên"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsShiftModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : editingShift ? "Lưu thay đổi" : "Tạo ca trực"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. Modal: Create Shift Log ────────────────────────────────────── */}
      {isLogModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title">GHI NHẬT KÝ CA TRỰC</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsLogModalOpen(false)}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="modal-form">
              <div className="form-field">
                <label>Phân loại nhật ký:</label>
                <select
                  value={logForm.type}
                  onChange={(e) => setLogForm({ ...logForm, type: Number(e.target.value) })}
                >
                  <option value={1}>1 - Bàn giao ca trực (Chìa khóa, tình trạng phòng)</option>
                  <option value={2}>2 - Sự cố phát sinh (Hư hỏng thiết bị, vi phạm)</option>
                  <option value={3}>3 - Kiểm tra an ninh &amp; Vệ sinh phòng</option>
                </select>
              </div>

              <div className="form-field">
                <label>
                  Nội dung ghi chép chi tiết: <span className="req-star">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ghi rõ tình trạng bàn giao phòng, số lượng chìa khóa, các thiết bị kiểm tra hoặc các sự cố cần lưu ý cho ca tiếp theo..."
                  value={logForm.content}
                  onChange={(e) => setLogForm({ ...logForm, content: e.target.value })}
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsLogModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu nhật ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
