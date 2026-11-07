import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  fetchUsageSessions,
  fetchUsageSummary,
  checkInSession,
  checkOutSession,
  cancelNoShow,
  getCheckInStatus,
  type UsageSessionItem,
  type UsageSummary,
} from "../../lib/usage";
import { cancelBookingDetailByStaffApi } from "../../lib/booking";
import {
  DoorIcon,
  CheckCircleIcon,
  SearchIcon,
  ClockIcon,
  UsersIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  BanIcon,
  ClipboardListIcon,
  AlertTriangleIcon,
  CalendarIcon,
  BellRingIcon,
  ZapIcon,
  PencilIcon,
  PlusIcon,
  FileTextIcon,
  DotsIcon,
  InfoIcon,
} from "../Icon";
import { useAuth } from "../../auth/AuthContext";
import {
  getAllReminders,
  fetchReminders,
  addReminder,
  type SessionReminderItem,
  REMINDER_PRESETS,
} from "../../lib/reminders";
import {
  fetchViolationTypes,
  recordViolation,
  uploadViolationAttachment,
  type ViolationTypeItem,
} from "../../lib/violations";
import { createIncident } from "../../lib/incidents";
import AdminPagination from "../common/AdminPagination";
import { formatDateTime24h } from "../../lib/dateTimeFormat";

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminUsageSessionsTab({ onNotify }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UsageSessionItem[]>([]);
  const [summary, setSummary] = useState<UsageSummary>({
    totalToday: 0,
    inUseCount: 0,
    pendingCheckInCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [buildingFilter, setBuildingFilter] = useState<string>("ALL");
  const [reminderFilter, setReminderFilter] = useState<"ALL" | "HAS_REMINDERS">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "room" | "borrower">("newest");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Quản lý nhắc nhở nội quy (Rule of 3 Warnings)
  const [reminders, setReminders] = useState<SessionReminderItem[]>([]);
  const refreshReminders = async () => {
    try {
      const list = await fetchReminders();
      setReminders(list);
    } catch {
      setReminders(getAllReminders());
    }
  };

  useEffect(() => {
    void refreshReminders();
  }, []);

  // Modal Gửi nhắc nhở
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTargetSession, setReminderTargetSession] = useState<UsageSessionItem | null>(null);
  const [reminderReason, setReminderReason] = useState<string>(REMINDER_PRESETS[0]);
  const [customReason, setCustomReason] = useState<string>("");
  const [reminderNote, setReminderNote] = useState<string>("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  // Modal Xem lịch sử nhắc nhở
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetSession, setHistoryTargetSession] = useState<UsageSessionItem | null>(null);

  // Dropdown Action Menu (3 dots) state & handlers
  const [rowMenu, setRowMenu] = useState<{
    key: number;
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

  function toggleRowMenu(key: number, btn: HTMLElement) {
    if (rowMenu?.key === key) {
      setRowMenu(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 180;
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

  const openReminderModal = (session: UsageSessionItem) => {
    if (session.status === "Hoàn thành" || session.status === "Đã hủy") {
      onNotify("Không thể gửi nhắc nhở cho ca đã hoàn thành hoặc đã hủy.", "warning");
      return;
    }
    setReminderTargetSession(session);
    setReminderReason(REMINDER_PRESETS[0]);
    setCustomReason("");
    setReminderNote("");
    setShowReminderModal(true);
  };

  const openReminderHistory = (session: UsageSessionItem) => {
    setHistoryTargetSession(session);
    setShowHistoryModal(true);
  };

  const handleSendReminderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reminderTargetSession) return;
    if (reminderTargetSession.status === "Hoàn thành" || reminderTargetSession.status === "Đã hủy") {
      onNotify("Không thể gửi nhắc nhở cho ca đã hoàn thành hoặc đã hủy.", "warning");
      setShowReminderModal(false);
      return;
    }

    const finalReason =
      reminderReason === "OTHER"
        ? customReason.trim() || "Vi phạm quy định sử dụng phòng"
        : reminderReason;

    try {
      setIsSubmittingReminder(true);
      const staffName =
        user?.fullName || user?.cardCode || "Cán bộ trực ban";

      const result = await addReminder({
        sessionId: reminderTargetSession.id,
        userId: reminderTargetSession.userId,
        userName: reminderTargetSession.userName,
        userFullName: reminderTargetSession.userFullName,
        userCardCode: reminderTargetSession.userCardCode,
        roomId: reminderTargetSession.roomId,
        roomCode: reminderTargetSession.roomCode,
        roomName: reminderTargetSession.roomName,
        reason: finalReason,
        note: reminderNote.trim() || undefined,
        remindedByStaff: staffName,
      });

      await refreshReminders();
      setShowReminderModal(false);

      if (result.isEscalated) {
        onNotify(
          `CẢNH BÁO QUÁ 3 LẦN NHẮC NHỞ: Hệ thống đã TỰ ĐỘNG lập Biên bản vi phạm #${result.violationRecord?.code || ""
          } và ban hành lệnh cấm mượn phòng 3 ngày cho sinh viên ${reminderTargetSession.userFullName
          }!`,
          "warning"
        );
      } else {
        onNotify(
          `Đã gửi lời nhắc nhở (Lần ${result.warningLevel}/3) tới sinh viên ${reminderTargetSession.userFullName} thành công!`,
          "info"
        );
      }
    } catch (err: any) {
      console.error("Lỗi khi gửi nhắc nhở:", err);
      onNotify("Không thể gửi nhắc nhở. Vui lòng thử lại.", "warning");
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  // Modal Chi tiết phiên sử dụng
  const [detailSession, setDetailSession] = useState<UsageSessionItem | null>(null);

  // Modal Check-out & Khảo sát
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedSessionForCheckout, setSelectedSessionForCheckout] =
    useState<UsageSessionItem | null>(null);
  const [checkoutChecklist, setCheckoutChecklist] = useState({
    devicesOk: true,
    cleaned: true,
    lightsOff: true,
    roomCondition: "Trống" as "Trống" | "Bảo trì",
    staffNote: "",
  });
  const [isSubmittingCheckout, setIsSubmittingCheckout] = useState(false);

  // Modal Check-in nhanh bằng mã
  const [showQuickCodeModal, setShowQuickCodeModal] = useState(false);
  const [quickCodeInput, setQuickCodeInput] = useState("");
  const [isSubmittingQuickCheckIn, setIsSubmittingQuickCheckIn] = useState(false);

  // Modal Lập biên bản vi phạm từ phiên sử dụng
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationTargetSession, setViolationTargetSession] =
    useState<UsageSessionItem | null>(null);
  const [violationTypes, setViolationTypes] = useState<ViolationTypeItem[]>([]);
  const [violationTypeId, setViolationTypeId] = useState<number>(0);
  const [violationDesc, setViolationDesc] = useState("");
  const [violationSeverity, setViolationSeverity] = useState<number>(2);
  const [violationPenalty, setViolationPenalty] = useState("");
  const [violationRestrictDays, setViolationRestrictDays] = useState<number>(0);
  const [violationStatus, setViolationStatus] = useState<string>("Đã xử lý");
  const [violationFiles, setViolationFiles] = useState<File[]>([]);
  const violationFileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmittingViolation, setIsSubmittingViolation] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const openViolationModalForSession = async (session: UsageSessionItem) => {
    setViolationTargetSession(session);
    setViolationFiles([]);
    try {
      const types = await fetchViolationTypes();
      setViolationTypes(types);
      if (types.length > 0) {
        setViolationTypeId(types[0].id);
        setViolationSeverity(types[0].severity);
        setViolationPenalty(types[0].defaultPenalty || "Cảnh cáo");
        if (types[0].severity >= 3) {
          setViolationRestrictDays(14);
          setViolationStatus("Đang xử lý");
        } else if (types[0].severity === 2) {
          setViolationRestrictDays(3);
          setViolationStatus("Đã xử lý");
        } else {
          setViolationRestrictDays(0);
          setViolationStatus("Đã xử lý");
        }
      }
    } catch {
      // ignore
    }
    setViolationDesc(
      `Phát hiện vi phạm tại phòng ${session.roomCode} (${session.roomName}) trong phiên sử dụng #${session.id}.`
    );
    setShowViolationModal(true);
  };

  const handleRecordViolationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!violationTargetSession) return;
    try {
      setIsSubmittingViolation(true);
      const createdRecord = await recordViolation({
        userId: violationTargetSession.userId,
        violationTypeId: violationTypeId,
        usageSessionId: violationTargetSession.id,
        description: violationDesc.trim(),
        severity: violationSeverity,
        penaltyApplied: violationPenalty.trim() || "Cảnh cáo",
        restrictDays: violationRestrictDays,
        status: violationStatus,
      });

      if (violationFiles.length > 0 && createdRecord?.id) {
        for (const file of violationFiles) {
          try {
            await uploadViolationAttachment(createdRecord.id, file);
          } catch (uploadErr) {
            console.error("Lỗi tải tệp đính kèm lên MinIO:", uploadErr);
          }
        }
      }

      onNotify(
        `Đã lập biên bản vi phạm thành công cho ${violationTargetSession.userFullName}! (${violationStatus})${violationFiles.length > 0 ? ` (Đã tải ${violationFiles.length} tệp lên MinIO)` : ""
        }`,
        "success"
      );
      setShowViolationModal(false);
      setViolationTargetSession(null);
      setViolationFiles([]);
      await loadData();
    } catch (err: any) {
      console.error("Failed to record violation from session:", err);
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : null) ||
        err.message ||
        "Không thể lưu biên bản vi phạm.";
      onNotify(serverMsg, "warning");
    } finally {
      setIsSubmittingViolation(false);
    }
  };

  // Load dữ liệu
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [list, sum] = await Promise.all([
        fetchUsageSessions({
          status: statusFilter,
          date: dateFilter || undefined,
          search: searchTerm || undefined,
        }),
        fetchUsageSummary(),
      ]);
      setSessions(list);
      setSummary(sum);
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể tải danh sách phiên sử dụng.",
        "warning"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, dateFilter]);

  // Search debounce / submit
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Check-in nhanh một phiên
  const handleCheckIn = async (session: UsageSessionItem) => {
    const checkInCheck = getCheckInStatus(session);
    if (!checkInCheck.allowed) {
      onNotify(
        checkInCheck.reason || "Chưa đến thời điểm nhận phòng theo quy định.",
        "warning"
      );
      return;
    }

    try {
      await checkInSession({
        usageSessionId: session.id,
        bookingDetailId: session.bookingDetailId,
      });
      onNotify(
        `Check-in thành công cho phòng ${session.roomCode} (${session.roomName})!`,
        "success"
      );
      loadData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Check-in không thành công.",
        "warning"
      );
    }
  };

  // Quản lý Hủy ca mượn / Hủy phòng (Áp dụng cả trước giờ mượn, sắp tới giờ nhận phòng & No-show)
  const CANCEL_SESSION_PRESETS = [
    "Sự cố, hỏng hóc thiết bị hoặc cơ sở vật chất phòng đột xuất",
    "Nhà trường trưng dụng phòng cho sự kiện, hội thảo hoặc thi cử đột xuất",
    "Khu học thuật tạm đóng cửa theo chỉ đạo của nhà trường",
    "Quá 15 phút không đến nhận phòng (No-show)",
    "Người mượn liên hệ xin hủy / thay đổi kế hoạch",
    "Quản lý điều chỉnh lại kế hoạch vận hành phòng",
    "OTHER",
  ];
  const [cancelTargetSession, setCancelTargetSession] = useState<UsageSessionItem | null>(null);
  const [cancelSessionReasonPreset, setCancelSessionReasonPreset] = useState<string>(CANCEL_SESSION_PRESETS[0]);
  const [customCancelSessionDetail, setCustomCancelSessionDetail] = useState<string>("");
  const [isSubmittingCancelSession, setIsSubmittingCancelSession] = useState(false);

  const openCancelSessionModal = (session: UsageSessionItem) => {
    if (session.status === "Hoàn thành" || session.status === "Đã hủy") {
      onNotify("Ca mượn phòng này đã kết thúc hoặc đã bị hủy.", "warning");
      return;
    }
    setCancelTargetSession(session);
    const isPastStart = session.startAt && new Date(session.startAt).getTime() <= Date.now();
    setCancelSessionReasonPreset(
      isPastStart
        ? "Quá 15 phút không đến nhận phòng (No-show)"
        : "Sự cố, hỏng hóc thiết bị hoặc cơ sở vật chất phòng đột xuất"
    );
    setCustomCancelSessionDetail("");
  };

  const handleCancelSessionSubmit = async () => {
    if (!cancelTargetSession) return;

    const finalReason =
      cancelSessionReasonPreset === "OTHER"
        ? customCancelSessionDetail.trim()
        : customCancelSessionDetail.trim()
          ? `${cancelSessionReasonPreset}: ${customCancelSessionDetail.trim()}`
          : cancelSessionReasonPreset;

    if (!finalReason) {
      onNotify("Vui lòng chọn hoặc nhập lý do hủy phòng cụ thể.", "warning");
      return;
    }

    try {
      setIsSubmittingCancelSession(true);
      if (cancelTargetSession.bookingDetailId) {
        await cancelBookingDetailByStaffApi(cancelTargetSession.bookingDetailId, finalReason);
      } else {
        await cancelNoShow(cancelTargetSession.id, finalReason);
      }
      onNotify(
        `Đã hủy ca mượn phòng ${cancelTargetSession.roomCode} thành công. Hệ thống đã gửi email và thông báo cho người đặt.`,
        "info"
      );
      setCancelTargetSession(null);
      await loadData();
    } catch (err: any) {
      console.error("Cancel session error:", err);
      onNotify(
        err.response?.data?.message || err.message || "Hủy ca mượn phòng thất bại.",
        "warning"
      );
    } finally {
      setIsSubmittingCancelSession(false);
    }
  };

  // Mở modal Check-out & Khảo sát
  const openCheckoutModal = (session: UsageSessionItem) => {
    setSelectedSessionForCheckout(session);
    setCheckoutChecklist({
      devicesOk: true,
      cleaned: true,
      lightsOff: true,
      roomCondition: "Trống",
      staffNote: "",
    });
    setShowCheckoutModal(true);
  };

  // Xác nhận trả phòng
  const handleConfirmCheckout = async () => {
    if (!selectedSessionForCheckout) return;
    try {
      setIsSubmittingCheckout(true);
      await checkOutSession({
        usageSessionId: selectedSessionForCheckout.id,
        roomCondition: checkoutChecklist.roomCondition,
        staffNote: checkoutChecklist.staffNote,
        devicesOk: checkoutChecklist.devicesOk,
        cleaned: checkoutChecklist.cleaned,
        lightsOff: checkoutChecklist.lightsOff,
      });

      let ticketCode = "";
      if (checkoutChecklist.roomCondition === "Bảo trì") {
        try {
          const newIncident = await createIncident({
            roomCode: selectedSessionForCheckout.roomCode,
            roomId: selectedSessionForCheckout.roomId,
            roomName: selectedSessionForCheckout.roomName,
            targetType: "Phòng",
            category: !checkoutChecklist.devicesOk ? "Thiết bị hư hỏng" : "Cơ sở vật chất / Bàn ghế",
            severity: "Khẩn cấp",
            description:
              checkoutChecklist.staffNote ||
              (!checkoutChecklist.devicesOk
                ? "Thiết bị trong phòng gặp sự cố khi thủ thư kiểm tra trả phòng."
                : "Phát hiện sự cố kỹ thuật trong quá trình kiểm tra bàn giao trả phòng."),
            status: "Chờ tiếp nhận",
            reportedBy: "Thủ thư trực ca (Biên bản trả phòng)",
            sessionId: selectedSessionForCheckout.id,
          });
          ticketCode = newIncident.code;
        } catch (e) {
          console.error("Auto create incident error:", e);
        }
      }

      const conditionMsg =
        checkoutChecklist.roomCondition === "Bảo trì"
          ? `Phòng đã chuyển sang trạng thái Bảo trì & Tự động tạo phiếu sự cố ${ticketCode ? `[${ticketCode}] ` : ""}để kỹ thuật kiểm tra.`
          : "Phòng đã chuyển về trạng thái Trống sẵn sàng đón lượt mới.";

      onNotify(
        `Ghi nhận trả phòng ${selectedSessionForCheckout.roomCode} thành công! ${conditionMsg}`,
        "success"
      );
      setShowCheckoutModal(false);
      setSelectedSessionForCheckout(null);
      loadData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Xác nhận trả phòng không thành công.",
        "warning"
      );
    } finally {
      setIsSubmittingCheckout(false);
    }
  };

  // Check-in nhanh bằng mã xác nhận
  const handleQuickCodeCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickCodeInput.trim()) {
      onNotify("Vui lòng nhập mã xác nhận (Ví dụ: HUIT-84917).", "warning");
      return;
    }
    try {
      setIsSubmittingQuickCheckIn(true);
      const res = await checkInSession({
        confirmationCode: quickCodeInput.trim(),
      });
      onNotify(
        `Check-in thành công cho phòng ${res.roomCode}! Mã phiên: ${res.confirmationCode}`,
        "success"
      );
      setQuickCodeInput("");
      setShowQuickCodeModal(false);
      loadData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không tìm thấy phiên với mã xác nhận này.",
        "warning"
      );
    } finally {
      setIsSubmittingQuickCheckIn(false);
    }
  };

  // Lọc dữ liệu client-side nếu cần
  // Danh sách tòa nhà có trong dữ liệu
  const availableBuildings = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.building) set.add(s.building.trim());
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Lọc dữ liệu client-side và sắp xếp
  const filteredSessions = useMemo(() => {
    const list = sessions.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (buildingFilter !== "ALL" && s.building?.trim() !== buildingFilter) return false;
      if (reminderFilter === "HAS_REMINDERS") {
        const count = reminders.filter((r) => r.sessionId === s.id).length;
        if (count === 0) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = s.confirmationCode.toLowerCase().includes(q);
        const matchRoom =
          s.roomCode.toLowerCase().includes(q) ||
          s.roomName.toLowerCase().includes(q);
        const matchUser =
          s.userFullName.toLowerCase().includes(q) ||
          (s.userCardCode || "").toLowerCase().includes(q) ||
          s.userEmail.toLowerCase().includes(q);
        const matchActivity = (s.activityName || "").toLowerCase().includes(q);
        if (!matchCode && !matchRoom && !matchUser && !matchActivity)
          return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime();
      }
      if (sortBy === "room") {
        return a.roomCode.localeCompare(b.roomCode);
      }
      if (sortBy === "borrower") {
        return a.userFullName.localeCompare(b.userFullName);
      }
      return new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime();
    });
  }, [sessions, statusFilter, buildingFilter, searchTerm, sortBy, reminderFilter, reminders]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedSessions = filteredSessions.slice(pageStart, pageStart + pageSize);

  const resetAllFilters = () => {
    setStatusFilter("ALL");
    setSearchTerm("");
    setDateFilter("");
    setBuildingFilter("ALL");
    setReminderFilter("ALL");
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    reminderFilter !== "ALL" ||
    Boolean(searchTerm) ||
    Boolean(dateFilter) ||
    buildingFilter !== "ALL" ||
    sortBy !== "newest";

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")} (${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-usage-sessions-container">
      {/* ── 1. Top Summary Metric Cards ─────────────────────────────────── */}
      <div className="usage-summary-grid">
        <div className="usage-stat-card in-use-card">
          <div className="stat-icon-wrap in-use-icon">
            <DoorIcon size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Đang sử dụng phòng</span>
            <div className="stat-number-flex">
              <span className="stat-number">{summary.inUseCount}</span>
              <span className="live-dot-pulse" title="Trực tiếp" />
            </div>
            <span className="stat-sub">Phòng học đang có người sử dụng</span>
          </div>
        </div>

        <div className="usage-stat-card scheduled-card">
          <div className="stat-icon-wrap scheduled-icon">
            <ClockIcon size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Chờ nhận phòng</span>
            <span className="stat-number">{summary.pendingCheckInCount}</span>
            <span className="stat-sub">Yêu cầu đã duyệt chờ Check-in</span>
          </div>
        </div>

        <div className="usage-stat-card completed-card">
          <div className="stat-icon-wrap completed-icon">
            <CheckCircleIcon size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Đã trả phòng hôm nay</span>
            <span className="stat-number">{summary.completedCount}</span>
            <span className="stat-sub">Hoàn tất bàn giao & khảo sát</span>
          </div>
        </div>

        <div className="usage-stat-card total-card">
          <div className="stat-icon-wrap total-icon">
            <ClipboardListIcon size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng phiên theo lịch hôm nay</span>
            <span className="stat-number">{summary.totalToday}</span>
            <span className="stat-sub">Các lượt khai thác phòng</span>
          </div>
        </div>
      </div>

      {/* ── 2. Action Controls & Filter Toolbar ─────────────────────────── */}
      <div className="usage-toolbar-panel">
        <div className="usage-toolbar-left">
          {/* Status Tabs */}
          <div className="status-filter-pills">
            <button
              type="button"
              className={`pill-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              Tất cả ({sessions.length})
            </button>
            <button
              type="button"
              className={`pill-btn pill-inuse ${statusFilter === "Đang sử dụng" ? "active" : ""
                }`}
              onClick={() => setStatusFilter("Đang sử dụng")}
            >
              <span className="pill-dot inuse" />
              Đang sử dụng ({sessions.filter((s) => s.status === "Đang sử dụng").length})
            </button>
            <button
              type="button"
              className={`pill-btn pill-scheduled ${statusFilter === "Chờ nhận phòng" ? "active" : ""
                }`}
              onClick={() => setStatusFilter("Chờ nhận phòng")}
            >
              <span className="pill-dot scheduled" />
              Chờ nhận phòng ({sessions.filter((s) => s.status === "Chờ nhận phòng").length})
            </button>
            <button
              type="button"
              className={`pill-btn pill-completed ${statusFilter === "Hoàn thành" ? "active" : ""
                }`}
              onClick={() => setStatusFilter("Hoàn thành")}
            >
              <span className="pill-dot completed" />
              Đã trả phòng ({sessions.filter((s) => s.status === "Hoàn thành").length})
            </button>
            <button
              type="button"
              className={`pill-btn ${reminderFilter === "HAS_REMINDERS" ? "active" : ""
                }`}
              onClick={() => {
                setReminderFilter(
                  reminderFilter === "HAS_REMINDERS" ? "ALL" : "HAS_REMINDERS"
                );
                setPage(1);
              }}
              style={{
                borderColor: reminderFilter === "HAS_REMINDERS" ? "#f59e0b" : undefined,
                color: reminderFilter === "HAS_REMINDERS" ? "#b45309" : undefined,
                backgroundColor: reminderFilter === "HAS_REMINDERS" ? "#fef3c7" : undefined,
              }}
              title="Lọc các phiên đang có cảnh báo nhắc nhở nội quy"
            >
              <BellRingIcon size={12} className="mr-1 inline-block" />
              Có nhắc nhở ({sessions.filter((s) => reminders.some((r) => r.sessionId === s.id)).length})
            </button>
          </div>
        </div>

        <div className="usage-toolbar-right">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="usage-search-box">
            <SearchIcon size={16} />
            <input
              type="text"
              placeholder="Tìm theo phòng, MSSV, tên, mã xác nhận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchTerm("");
                  loadData();
                }}
              >
                <XIcon size={14} />
              </button>
            )}
          </form>

          {/* Date filter with modern wrap */}
          <div className="usage-date-picker-wrap">
            <CalendarIcon size={16} className="usage-date-icon" />
            <input
              type="date"
              className="usage-date-picker"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Lọc theo ngày sử dụng"
            />
            {dateFilter && (
              <button
                type="button"
                className="clear-date-filter-btn"
                onClick={() => setDateFilter("")}
                title="Bỏ lọc theo ngày (Xem tất cả)"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* Tòa nhà / Khu vực filter */}
          {availableBuildings.length > 0 && (
            <select
              className="usage-date-picker"
              value={buildingFilter}
              onChange={(e) => {
                setBuildingFilter(e.target.value);
                setPage(1);
              }}
              title="Lọc theo Tòa nhà / Khu vực"
              style={{ minWidth: "125px", height: "38px" }}
            >
              <option value="ALL">Tất cả khu vực</option>
              {availableBuildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}

          {/* Sắp xếp */}
          <select
            className="usage-date-picker"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            title="Sắp xếp danh sách phiên"
            style={{ minWidth: "135px", height: "38px" }}
          >
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
            <option value="room">Mã phòng A-Z</option>
            <option value="borrower">Tên người mượn A-Z</option>
          </select>

          {/* Nút xóa bộ lọc tiện ích */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-table-action"
              onClick={resetAllFilters}
              title="Xóa tất cả bộ lọc hiện tại về mặc định"
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
              <span>Xóa bộ lọc</span>
            </button>
          )}

          {/* Quick Check-in by Code Button */}
          <button
            type="button"
            className="btn-quick-code-checkin"
            onClick={() => setShowQuickCodeModal(true)}
          >
            <ShieldCheckIcon size={16} />
            <span>Check-in bằng mã</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn-usage-refresh"
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <RefreshCwIcon size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── 3. Sessions Data Table ─────────────────────────────────────── */}
      <div className="usage-table-card">
        {isLoading && sessions.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCwIcon size={28} className="animate-spin" />
            <p>Đang đồng bộ phiên sử dụng phòng từ hệ thống...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-state-icon-box">
              <DoorIcon size={32} />
            </div>
            <h4>Không có phiên sử dụng nào phù hợp</h4>
            <p>
              Hiện chưa có phiên mượn phòng nào theo điều kiện lọc hiện tại.
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive-wrapper">
              <table className="usage-data-table">
                <thead>
                  <tr>
                    <th className="cell-code">MÃ XÁC NHẬN</th>
                    <th className="cell-room">PHÒNG HỌC &amp; VỊ TRÍ</th>
                    <th className="cell-borrower">NGƯỜI CHỊU TRÁCH NHIỆM</th>
                    <th className="cell-schedule">LỊCH ĐĂNG KÝ</th>
                    <th className="cell-checkin">CHECK-IN</th>
                    <th className="cell-checkout">CHECK-OUT</th>
                    <th className="cell-status">TRẠNG THÁI</th>
                    <th className="cell-actions text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSessions.map((session) => {
                    const sessionReminders = reminders.filter(
                      (r) => r.sessionId === session.id
                    );
                    const reminderCount = sessionReminders.length;

                    return (
                      <tr
                        key={session.id}
                        className={`status-row-${session.status} admin-clickable-row`}
                        onClick={() => setDetailSession(session)}
                        title="Bấm vào dòng để xem chi tiết phiên sử dụng phòng này"
                      >
                        {/* Confirmation Code */}
                        <td className="cell-code">
                          <span className="code-badge-pill" title="Mã xác nhận nhận phòng">
                            {session.confirmationCode}
                          </span>
                        </td>

                        {/* Room & Building */}
                        <td className="cell-room">
                          <div className="room-primary-name">
                            <strong>{session.roomName}</strong>
                            <span className="room-code-tag">{session.roomCode}</span>
                          </div>
                          <div className="room-sub-loc">
                            {session.building || "Khu A"} • {session.floor || "Tầng 1"}
                          </div>
                        </td>

                        {/* Borrower Info */}
                        <td className="cell-borrower">
                          <div className="borrower-name">
                            <strong>{session.userFullName}</strong>
                            {session.userCardCode && (
                              <span className="borrower-mssv">
                                MSSV: {session.userCardCode}
                              </span>
                            )}
                          </div>
                          <div className="borrower-sub">
                            <span>{session.activityName}</span>
                            {session.guestCount > 0 && (
                              <span className="guest-badge">
                                <UsersIcon size={12} /> {session.guestCount} người
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Scheduled Period / Time */}
                        <td className="cell-schedule">
                          {session.startPeriodName && session.endPeriodName ? (
                            <div className="schedule-period-tag">
                              {session.startPeriodName} → {session.endPeriodName}
                            </div>
                          ) : (
                            <div className="schedule-time-range">
                              {formatDateTime(session.startAt)} → {formatDateTime(session.endAt)}
                            </div>
                          )}
                        </td>

                        {/* Actual Check-In */}
                        <td className="cell-checkin">
                          {session.actualCheckIn ? (
                            <div className="actual-time-badge checkin-done">
                              <CheckIcon size={14} />
                              <span>{formatDateTime(session.actualCheckIn)}</span>
                            </div>
                          ) : (
                            <span className="text-muted">Chưa nhận</span>
                          )}
                        </td>

                        {/* Actual Check-Out */}
                        <td className="cell-checkout">
                          {session.actualCheckOut ? (
                            <div className="actual-time-badge checkout-done">
                              <CheckCircleIcon size={14} />
                              <span>{formatDateTime(session.actualCheckOut)}</span>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="cell-status">
                          {session.status === "Đang sử dụng" ? (
                            <span className="status-badge badge-in-use">
                              <span className="status-dot in-use-pulse" />
                              Đang sử dụng
                            </span>
                          ) : session.status === "Chờ nhận phòng" ? (
                            <span className="status-badge badge-scheduled">
                              <ClockIcon size={14} />
                              Chờ nhận phòng
                            </span>
                          ) : session.status === "Hoàn thành" ? (
                            <span className="status-badge badge-completed">
                              <CheckCircleIcon size={14} />
                              Hoàn thành
                            </span>
                          ) : (
                            <span className="status-badge badge-cancelled">
                              <BanIcon size={14} />
                              Đã hủy
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="cell-actions text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="action-button-group">
                            {session.status === "Chờ nhận phòng" && (() => {
                              const checkInStatus = getCheckInStatus(session);
                              return (
                                <button
                                  type="button"
                                  className={`btn-table-action btn-checkin ${!checkInStatus.allowed ? "is-disabled" : ""}`}
                                  onClick={() => handleCheckIn(session)}
                                  disabled={!checkInStatus.allowed}
                                  title={
                                    checkInStatus.allowed
                                      ? "Xác nhận nhận phòng ngay"
                                      : checkInStatus.reason
                                  }
                                >
                                  <ShieldCheckIcon size={14} />
                                  <span>Check-in</span>
                                </button>
                              );
                            })()}

                            {session.status === "Đang sử dụng" && (
                              <button
                                type="button"
                                className="btn-table-action btn-checkout"
                                onClick={() => openCheckoutModal(session)}
                                title="Khảo sát thiết bị & Xác nhận trả phòng"
                              >
                                <ClipboardListIcon size={14} />
                                <span>Trả phòng</span>
                              </button>
                            )}

                            {session.status === "Hoàn thành" && (
                              <span className="done-pill" title="Đã hoàn tất ca sử dụng">
                                <CheckCircleIcon size={14} /> Đã trả phòng
                              </span>
                            )}

                            {session.status === "Đã hủy" && (
                              <span className="done-pill" style={{ color: "#ef4444" }} title="Ca mượn đã bị hủy">
                                <BanIcon size={14} /> Đã hủy
                              </span>
                            )}

                            <button
                              type="button"
                              className={`btn-table-more ${rowMenu?.key === session.id ? "active" : ""}`}
                              title="Thêm chức năng"
                              aria-label="Thêm chức năng"
                              onClick={(e) => toggleRowMenu(session.id, e.currentTarget)}
                            >
                              <DotsIcon size={17} />
                            </button>
                          </div>

                          {rowMenu?.key === session.id &&
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
                                  className="row-actions-menu-item"
                                  onClick={() => {
                                    setRowMenu(null);
                                    setDetailSession(session);
                                  }}
                                >
                                  <InfoIcon size={14} />
                                  <span>Chi tiết phiên sử dụng</span>
                                </button>

                                {session.status !== "Hoàn thành" && session.status !== "Đã hủy" && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`row-actions-menu-item ${
                                      reminderCount >= 3
                                        ? "danger"
                                        : reminderCount > 0
                                          ? "accent-amber"
                                          : ""
                                    }`}
                                    onClick={() => {
                                      setRowMenu(null);
                                      openReminderModal(session);
                                    }}
                                  >
                                    <BellRingIcon size={14} />
                                    <span>
                                      {reminderCount >= 3
                                        ? "Cảnh báo quá 3 lần nhắc"
                                        : reminderCount > 0
                                          ? `Nhắc nhở nội quy (${reminderCount}/3)`
                                          : "Nhắc nhở nội quy"}
                                    </span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-actions-menu-item accent-amber"
                                  onClick={() => {
                                    setRowMenu(null);
                                    openViolationModalForSession(session);
                                  }}
                                >
                                  <AlertTriangleIcon size={14} />
                                  <span>Lập biên bản vi phạm</span>
                                </button>

                                {session.status === "Chờ nhận phòng" && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="row-actions-menu-item danger"
                                    onClick={() => {
                                      setRowMenu(null);
                                      openCancelSessionModal(session);
                                    }}
                                  >
                                    <BanIcon size={14} />
                                    <span>Hủy ca mượn phòng</span>
                                  </button>
                                )}
                              </div>,
                              document.body
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AdminPagination
              currentPage={currentPage}
              totalItems={filteredSessions.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(sz) => setPageSize(sz)}
              itemLabel="phiên sử dụng"
            />
          </>
        )}
      </div>

      {/* ── Modal 1: Khảo sát thiết bị & Xác nhận trả phòng ─────────────────── */}
      {showCheckoutModal && selectedSessionForCheckout && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box checkout-modal-card">
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h3 className="modal-title">
                  Khảo sát hoàn tất &amp; Ghi nhận trả phòng #{selectedSessionForCheckout.roomCode}
                </h3>
                <span className="modal-sub-tag">
                  {selectedSessionForCheckout.roomName}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCheckoutModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="admin-modal-form-wrap">
              <div className="modal-body-scrollable">
                <div className="checkout-summary-banner">
                  <div className="banner-item">
                    <span className="banner-label">Người mượn:</span>
                    <strong>{selectedSessionForCheckout.userFullName}</strong>
                  </div>
                  {selectedSessionForCheckout.userCardCode && (
                    <div className="banner-item">
                      <span className="banner-label">MSSV:</span>
                      <strong>{selectedSessionForCheckout.userCardCode}</strong>
                    </div>
                  )}
                  <div className="banner-item">
                    <span className="banner-label">Hoạt động:</span>
                    <span>{selectedSessionForCheckout.activityName}</span>
                  </div>
                </div>

                <h4 className="checklist-heading">
                  1. Biên bản kiểm tra hiện trạng phòng học &amp; thiết bị:
                </h4>

                <div className="checklist-group">
                  <label className="checkbox-item-row">
                    <input
                      type="checkbox"
                      checked={checkoutChecklist.devicesOk}
                      onChange={(e) =>
                        setCheckoutChecklist({
                          ...checkoutChecklist,
                          devicesOk: e.target.checked,
                          roomCondition: e.target.checked ? "Trống" : "Bảo trì",
                        })
                      }
                    />
                    <span>
                      <strong>Thiết bị điện tử:</strong> Smart TV, máy chiếu, micro, hub dây cáp, điều hòa nguyên vẹn, hoạt động tốt.
                    </span>
                  </label>

                  <label className="checkbox-item-row">
                    <input
                      type="checkbox"
                      checked={checkoutChecklist.cleaned}
                      onChange={(e) =>
                        setCheckoutChecklist({
                          ...checkoutChecklist,
                          cleaned: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Vệ sinh &amp; bàn ghế:</strong> Bàn ghế được sắp xếp ngăn nắp, không xả rác trong phòng học.
                    </span>
                  </label>

                  <label className="checkbox-item-row">
                    <input
                      type="checkbox"
                      checked={checkoutChecklist.lightsOff}
                      onChange={(e) =>
                        setCheckoutChecklist({
                          ...checkoutChecklist,
                          lightsOff: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>An toàn điện:</strong> Đã tắt điều hòa, hệ thống chiếu sáng và ngắt thiết bị trước khi ra về.
                    </span>
                  </label>
                </div>

                <h4 className="checklist-heading mt-4">
                  2. Trạng thái phòng sau khi tiếp nhận bàn giao:
                </h4>
                <div className="condition-radio-group">
                  <label
                    className={`condition-radio-card ${checkoutChecklist.roomCondition === "Trống" ? "active" : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="roomCondition"
                      value="Trống"
                      checked={checkoutChecklist.roomCondition === "Trống"}
                      onChange={() =>
                        setCheckoutChecklist({
                          ...checkoutChecklist,
                          roomCondition: "Trống",
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title text-success">
                        <CheckIcon size={14} className="inline-block" style={{ marginRight: "4px" }} /> Phòng bình thường (Trống)
                      </span>
                      <span className="radio-desc">
                        Phòng sạch sẽ, thiết bị tốt, sẵn sàng đón lượt đặt tiếp theo.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`condition-radio-card ${checkoutChecklist.roomCondition === "Bảo trì" ? "active danger" : ""
                      }`}
                  >
                    <input
                      type="radio"
                      name="roomCondition"
                      value="Bảo trì"
                      checked={checkoutChecklist.roomCondition === "Bảo trì"}
                      onChange={() =>
                        setCheckoutChecklist({
                          ...checkoutChecklist,
                          roomCondition: "Bảo trì",
                        })
                      }
                    />
                    <div className="radio-content">
                      <span className="radio-title text-danger">
                        <AlertTriangleIcon size={14} className="inline-block" style={{ marginRight: "4px" }} /> Cần bảo trì / Xử lý sự cố
                      </span>
                      <span className="radio-desc">
                        Phát hiện hỏng hóc thiết bị hoặc sự cố cần khóa phòng để kỹ thuật xử lý. (Tự động tạo phiếu sự cố)
                      </span>
                    </div>
                  </label>
                </div>

                <div className="form-field mt-3">
                  <label>Ghi chú của Thủ thư tiếp nhận:</label>
                  <textarea
                    rows={3}
                    placeholder="Nhập ghi chú tình trạng thiết bị, đánh giá buổi mượn..."
                    value={checkoutChecklist.staffNote}
                    onChange={(e) =>
                      setCheckoutChecklist({
                        ...checkoutChecklist,
                        staffNote: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer-pinned">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCheckoutModal(false)}
                  disabled={isSubmittingCheckout}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn-modal-submit"
                  onClick={handleConfirmCheckout}
                  disabled={isSubmittingCheckout}
                >
                  {isSubmittingCheckout ? (
                    <>
                      <RefreshCwIcon size={16} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Xác nhận hoàn tất trả phòng</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 2: Check-in nhanh bằng mã xác nhận ──────────────────────── */}
      {showQuickCodeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box quick-checkin-modal">
            <div className="modal-header">
              <h3 className="modal-title">Check-in nhận phòng bằng mã xác nhận</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowQuickCodeModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickCodeCheckIn} className="modal-form">
              <p className="quick-checkin-hint">
                Nhập mã xác nhận nhận phòng được cấp khi đặt phòng (Ví dụ:{" "}
                <strong>HUIT-84917</strong>):
              </p>

              <div className="form-field">
                <label>Mã xác nhận nhận phòng:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: HUIT-84917"
                  value={quickCodeInput}
                  onChange={(e) => setQuickCodeInput(e.target.value.toUpperCase())}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowQuickCodeModal(false)}
                  disabled={isSubmittingQuickCheckIn}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmittingQuickCheckIn}
                >
                  {isSubmittingQuickCheckIn ? (
                    <>
                      <RefreshCwIcon size={16} className="animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon size={16} />
                      <span>Xác nhận Check-in ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Lập biên bản vi phạm từ phiên sử dụng ───────────────── */}
      {showViolationModal && violationTargetSession && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box checkout-modal-card">
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#d97706" }}>
                  <AlertTriangleIcon size={18} />
                  <span>Lập biên bản vi phạm #{violationTargetSession.roomCode}</span>
                </h3>
                <span className="modal-sub-tag">
                  Phiên #{violationTargetSession.id} - {violationTargetSession.userFullName}
                  {violationTargetSession.userCardCode ? ` (${violationTargetSession.userCardCode})` : ""}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowViolationModal(false)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordViolationSubmit} className="admin-modal-form-wrap">
              <div className="modal-body-scrollable">
                <div className="form-field">
                  <label>Người chịu trách nhiệm phiên (Đồng bộ từ phiên sử dụng):</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>{violationTargetSession.userFullName}</span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>({violationTargetSession.userCardCode || `ID: ${violationTargetSession.userId}`})</span>
                    <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", marginLeft: "auto", fontWeight: 600 }}>Đồng bộ phiên #{violationTargetSession.id}</span>
                  </div>
                </div>

                <div className="form-field">
                  <label>Loại vi phạm (*):</label>
                  <select
                    value={violationTypeId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setViolationTypeId(id);
                      const vt = violationTypes.find((t) => t.id === id);
                      if (vt) {
                        setViolationSeverity(vt.severity);
                        setViolationPenalty(vt.defaultPenalty || "Cảnh cáo");
                        if (vt.severity >= 3) {
                          setViolationRestrictDays(14);
                          setViolationStatus("Đang xử lý");
                        } else if (vt.severity === 2) {
                          setViolationRestrictDays(3);
                          setViolationStatus("Đã xử lý");
                        } else {
                          setViolationRestrictDays(0);
                          setViolationStatus("Đã xử lý");
                        }
                      }
                    }}
                    required
                  >
                    {violationTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code} - {t.name} (Mức {t.severity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Mức độ nghiêm trọng (*):</label>
                  <select
                    value={violationSeverity}
                    onChange={(e) => {
                      const sev = Number(e.target.value);
                      setViolationSeverity(sev);
                      if (sev >= 3) {
                        setViolationStatus("Đang xử lý");
                        if (violationRestrictDays === 0) setViolationRestrictDays(14);
                      } else {
                        setViolationStatus("Đã xử lý");
                        if (sev === 2 && violationRestrictDays === 0) setViolationRestrictDays(3);
                      }
                    }}
                  >
                    <option value={1}>Mức 1 - Nhẹ (Nhắc nhở nội quy)</option>
                    <option value={2}>Mức 2 - Vừa / Trung bình (Cảnh cáo, vi phạm lần đầu)</option>
                    <option value={3}>Mức 3 - Nghiêm trọng (Làm hỏng tài sản, tái phạm nhiều lần)</option>
                    <option value={4}>Mức 4 - Rất nghiêm trọng (Hủy hoại tài sản, vi phạm quy chế nặng)</option>
                  </select>
                  {violationSeverity >= 3 ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#b45309",
                        backgroundColor: "#fef3c7",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontWeight: 500,
                      }}
                    >
                      <AlertTriangleIcon size={14} />
                      <span>
                        Mức độ nghiêm trọng (Mức {violationSeverity}): Tự động gán trạng thái <strong>'Đang xử lý'</strong>
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#15803d",
                        backgroundColor: "#dcfce7",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontWeight: 500,
                      }}
                    >
                      <CheckCircleIcon size={14} />
                      <span>
                        Mức độ nhẹ / vừa (Mức {violationSeverity}): Tự động gán trạng thái <strong>'Đã xử lý'</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label>Mô tả chi tiết vi phạm (*):</label>
                  <textarea
                    rows={3}
                    value={violationDesc}
                    onChange={(e) => setViolationDesc(e.target.value)}
                    placeholder="Nhập nội dung biên bản vi phạm..."
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Hình thức xử lý / Phạt (*):</label>
                  <input
                    type="text"
                    value={violationPenalty}
                    onChange={(e) => setViolationPenalty(e.target.value)}
                    placeholder="VD: Nhắc nhở / Cảnh cáo lần đầu"
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Áp dụng cấm mượn phòng (Khóa đặt phòng):</label>
                  <select
                    value={violationRestrictDays}
                    onChange={(e) =>
                      setViolationRestrictDays(Number(e.target.value))
                    }
                  >
                    <option value={0}>Không cấm mượn</option>
                    <option value={3}>Cấm mượn 3 ngày</option>
                    <option value={7}>Cấm mượn 7 ngày</option>
                    <option value={14}>Cấm mượn 14 ngày</option>
                    <option value={30}>Cấm mượn 30 ngày</option>
                  </select>
                </div>

                {/* MinIO Evidence Upload */}
                <div className="form-field">
                  <label>Tệp đính kèm &amp; Minh chứng (Không bắt buộc - Tùy chọn):</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <button
                      type="button"
                      className="btn-select-attachment"
                      onClick={() => violationFileInputRef.current?.click()}
                    >
                      <PlusIcon size={14} /> Chọn ảnh / tài liệu
                    </button>
                    <input
                      ref={violationFileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.doc,.xls,.xlsx"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setViolationFiles((prev) => [...prev, ...files]);
                        }
                        if (violationFileInputRef.current) violationFileInputRef.current.value = "";
                      }}
                    />
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {violationFiles.length > 0
                        ? `Đã chọn ${violationFiles.length} tệp`
                        : "(Tùy chọn) Hỗ trợ ảnh (.jpg, .png), tài liệu (.docx, .pdf). Không bắt buộc upload tệp."}
                    </span>
                  </div>

                  {violationFiles.length > 0 && (
                    <div className="attachment-queued-list" style={{ marginTop: "4px" }}>
                      {violationFiles.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="attachment-queued-chip">
                          <FileTextIcon size={14} />
                          <span className="file-name" title={file.name}>
                            {file.name} ({formatFileSize(file.size)})
                          </span>
                          <button
                            type="button"
                            className="btn-remove-queued-file"
                            onClick={() =>
                              setViolationFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            title="Bỏ tệp"
                          >
                            <XIcon size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-pinned">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowViolationModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmittingViolation}
                >
                  {isSubmittingViolation ? "Đang lưu..." : "Lưu biên bản vi phạm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Gửi nhắc nhở người dùng (Cơ chế quá 3 lần lập biên bản) ─────────────────── */}
      {showReminderModal && reminderTargetSession && (() => {
        const targetReminders = reminders.filter(
          (r) => r.sessionId === reminderTargetSession.id
        );
        const currentCount = targetReminders.length;
        const nextCount = currentCount + 1;
        const isExceeding = currentCount >= 3;

        return (
          <div className="admin-modal-overlay">
            <div className="admin-modal-box" style={{ maxWidth: "560px" }}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h3
                    className="modal-title"
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <BellRingIcon
                      size={20}
                      className={isExceeding ? "text-danger" : "color-amber"}
                    />
                    <span>Giám sát &amp; Gửi nhắc nhở nội quy</span>
                  </h3>
                  <span className="modal-sub-tag">
                    {reminderTargetSession.roomCode} - {reminderTargetSession.roomName}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowReminderModal(false)}
                >
                  <XIcon size={16} />
                </button>
              </div>

              <form onSubmit={handleSendReminderSubmit} className="admin-modal-form-wrap">
                <div className="modal-body-scrollable">
                  {/* Thông tin người mượn & Phiên */}
                  <div className="checkout-summary-banner">
                    <div className="banner-item">
                      <span className="banner-label">Người mượn:</span>
                      <strong>{reminderTargetSession.userFullName}</strong>
                    </div>
                    {reminderTargetSession.userCardCode && (
                      <div className="banner-item">
                        <span className="banner-label">MSSV:</span>
                        <strong>{reminderTargetSession.userCardCode}</strong>
                      </div>
                    )}
                    <div className="banner-item">
                      <span className="banner-label">Mã xác nhận:</span>
                      <span className="font-mono text-bold text-primary">
                        {reminderTargetSession.confirmationCode}
                      </span>
                    </div>
                  </div>

                  {/* Thước đo 4 bước: Quy tắc 3 lần */}
                  <div style={{ marginTop: "14px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        Tiến trình cảnh báo nội quy HUIT:
                      </span>
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          color: isExceeding
                            ? "#dc2626"
                            : currentCount > 0
                              ? "#d97706"
                              : "#64748b",
                        }}
                      >
                        {currentCount === 0
                          ? "Chưa có lời nhắc nào (0/3)"
                          : currentCount === 1
                            ? "Đã nhắc nhở lần 1 (1/3)"
                            : currentCount === 2
                              ? "Đã nhắc nhở lần 2 (2/3)"
                              : currentCount === 3
                                ? "ĐÃ ĐẠT GIỚI HẠN 3/3 - CẢNH BÁO TỐI ĐA"
                                : `ĐÃ VƯỢT QUÁ 3 LẦN (${currentCount} lần)`}
                      </span>
                    </div>

                    <div className="reminder-stepper-container">
                      <div className="reminder-stepper-track">
                        <div
                          className="reminder-stepper-track-fill"
                          style={{
                            width: `${Math.min(100, (currentCount / 3) * 100)}%`,
                          }}
                        />
                      </div>

                      <div
                        className={`reminder-step-node ${currentCount >= 1
                          ? "completed"
                          : nextCount === 1
                            ? "current"
                            : ""
                          }`}
                      >
                        <div className="reminder-step-circle">1</div>
                        <span className="reminder-step-label">
                          Lần 1<br />
                          Nhắc nhẹ
                        </span>
                      </div>

                      <div
                        className={`reminder-step-node ${currentCount >= 2
                          ? "completed"
                          : nextCount === 2
                            ? "current"
                            : ""
                          }`}
                      >
                        <div className="reminder-step-circle">2</div>
                        <span className="reminder-step-label">
                          Lần 2<br />
                          Cảnh cáo
                        </span>
                      </div>

                      <div
                        className={`reminder-step-node ${currentCount >= 3
                          ? "completed"
                          : nextCount === 3
                            ? "current"
                            : ""
                          }`}
                      >
                        <div className="reminder-step-circle">3</div>
                        <span className="reminder-step-label">
                          Lần 3<br />
                          Tối đa
                        </span>
                      </div>

                      <div
                        className={`reminder-step-node ${currentCount >= 3 ? "escalated" : ""
                          }`}
                      >
                        <div className="reminder-step-circle"><ZapIcon size={12} /></div>
                        <span className="reminder-step-label">
                          Quá 3 lần<br />
                          Biên bản
                        </span>
                      </div>
                    </div>
                  </div>

                  {currentCount > 0 && (
                    <div style={{ textAlign: "right", marginTop: "4px", marginBottom: "8px" }}>
                      <button
                        type="button"
                        style={{
                          fontSize: "12px",
                          color: "#0284c7",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                        }}
                        onClick={() => openReminderHistory(reminderTargetSession)}
                      >
                        Xem lịch sử {currentCount} lần nhắc trước của phiên này →
                      </button>
                    </div>
                  )}

                  {/* Banner cảnh báo vượt quá 3 lần */}
                  {isExceeding && (
                    <div className="reminder-escalation-banner">
                      <div className="escalation-banner-icon">
                        <AlertTriangleIcon size={20} />
                      </div>
                      <div className="escalation-banner-content">
                        <h4>CẢNH BÁO: ĐÃ QUÁ 3 LẦN NHẮC NHỞ!</h4>
                        <p>
                          Sinh viên này đã bị nhắc nhở đủ <strong>3 lần</strong> trong
                          phiên sử dụng. Theo Quy chế HUIT, thao tác gửi tiếp theo sẽ{" "}
                          <strong>
                            TỰ ĐỘNG CHUYỂN THÀNH LẬP BIÊN BẢN VI PHẠM KỶ LUẬT
                          </strong>{" "}
                          và{" "}
                          <strong>BAN HÀNH LỆNH CẤM MƯỢN PHÒNG 3 NGÀY</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Chọn lý do nhắc nhở */}
                  <div className="form-field" style={{ marginTop: "10px" }}>
                    <label>Lý do nhắc nhở vi phạm (*):</label>
                    <div className="quick-reason-chips-wrapper">
                      {REMINDER_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`quick-reason-chip ${reminderReason === preset ? "selected" : ""
                            }`}
                          onClick={() => {
                            setReminderReason(preset);
                            setCustomReason("");
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`quick-reason-chip ${reminderReason === "OTHER" ? "selected" : ""
                          }`}
                        onClick={() => setReminderReason("OTHER")}
                      >
                        <PencilIcon size={12} className="inline-block" style={{ marginRight: "4px" }} /> Lý do khác...
                      </button>
                    </div>

                    {reminderReason === "OTHER" && (
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Nhập lý do nhắc nhở..."
                        required
                        style={{ marginTop: "6px" }}
                      />
                    )}
                  </div>

                  {/* Ghi chú thêm */}
                  <div className="form-field">
                    <label>Ghi chú chi tiết của cán bộ (tùy chọn):</label>
                    <textarea
                      rows={2}
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="VD: Cán bộ nhắc nhở trực tiếp tại phòng, sinh viên đã đồng ý tuân thủ..."
                    />
                  </div>
                </div>

                <div className="modal-footer-pinned">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowReminderModal(false)}
                    disabled={isSubmittingReminder}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`btn-modal-submit ${isExceeding ? "btn-danger" : ""
                      }`}
                    disabled={isSubmittingReminder}
                    style={
                      isExceeding
                        ? { backgroundColor: "#dc2626", borderColor: "#b91c1c" }
                        : undefined
                    }
                  >
                    {isSubmittingReminder
                      ? "Đang xử lý..."
                      : isExceeding
                        ? "Xác nhận & Tự động lập biên bản vi phạm"
                        : `Gửi nhắc nhở (Lần ${nextCount}/3)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── Modal 5: Xem Lịch sử nhắc nhở của phiên sử dụng ─────────────────── */}
      {showHistoryModal && historyTargetSession && (() => {
        const targetReminders = reminders.filter(
          (r) => r.sessionId === historyTargetSession.id
        );

        return (
          <div className="admin-modal-overlay">
            <div className="admin-modal-box" style={{ maxWidth: "580px" }}>
              <div className="modal-header">
                <div className="modal-title-with-badge">
                  <h3
                    className="modal-title"
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                  >
                    <ClipboardListIcon size={18} />
                    <span>Lịch sử nhắc nhở nội quy</span>
                  </h3>
                  <span className="modal-sub-tag">
                    Phòng {historyTargetSession.roomCode} - Phiên #{historyTargetSession.id}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowHistoryModal(false)}
                >
                  <XIcon size={16} />
                </button>
              </div>

              <div className="admin-modal-form-wrap">
                <div className="modal-body-scrollable">
                  <div className="checkout-summary-banner">
                    <div className="banner-item">
                      <span className="banner-label">Người mượn:</span>
                      <strong>{historyTargetSession.userFullName}</strong>
                    </div>
                    {historyTargetSession.userCardCode && (
                      <div className="banner-item">
                        <span className="banner-label">MSSV:</span>
                        <strong>{historyTargetSession.userCardCode}</strong>
                      </div>
                    )}
                    <div className="banner-item">
                      <span className="banner-label">Tổng số lần nhắc:</span>
                      <strong
                        style={{
                          color:
                            targetReminders.length >= 3 ? "#dc2626" : "#d97706",
                        }}
                      >
                        {targetReminders.length} lần{" "}
                        {targetReminders.length > 3
                          ? "(Đã lập biên bản)"
                          : targetReminders.length === 3
                            ? "(Mức tối đa)"
                            : ""}
                      </strong>
                    </div>
                  </div>

                  {targetReminders.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 20px",
                        color: "#64748b",
                      }}
                    >
                      <div style={{ margin: "0 auto 10px", color: "#10b981", display: "inline-block" }}>
                        <CheckCircleIcon size={36} />
                      </div>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        Phiên sử dụng này chưa có ghi nhận nhắc nhở nào.
                      </p>
                    </div>
                  ) : (
                    <div className="reminder-timeline-list">
                      {targetReminders.map((item) => (
                        <div
                          key={item.id}
                          className={`reminder-timeline-item ${item.escalatedToViolation ? "is-escalated" : ""
                            }`}
                        >
                          <div
                            className={`timeline-level-badge ${item.escalatedToViolation
                              ? "timeline-level-escalated"
                              : item.warningLevel === 1
                                ? "timeline-level-1"
                                : item.warningLevel === 2
                                  ? "timeline-level-2"
                                  : "timeline-level-3"
                              }`}
                          >
                            {item.escalatedToViolation ? "VP" : `#${item.warningLevel}`}
                          </div>

                          <div className="timeline-content-wrap">
                            <div className="timeline-header-line">
                              <span className="timeline-reason-title">
                                {item.reason}
                                {item.escalatedToViolation && (
                                  <span className="reminder-escalated-pill">
                                    Đã lập biên bản{" "}
                                    {item.violationCode ? `#${item.violationCode}` : ""}
                                  </span>
                                )}
                              </span>
                              <span className="timeline-time-meta">
                                {formatDateTime24h(item.remindedAt, " - ")}
                              </span>
                            </div>

                            {item.note && (
                              <div className="timeline-note-text">"{item.note}"</div>
                            )}

                            <div className="timeline-staff-line">
                              Cán bộ thực hiện:{" "}
                              <strong>{item.remindedByStaff}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-footer-pinned">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowHistoryModal(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn-modal-submit"
                    onClick={() => {
                      setShowHistoryModal(false);
                      openReminderModal(historyTargetSession);
                    }}
                  >
                    <BellRingIcon size={14} className="mr-1 inline-block" />
                    <span>Tiếp tục nhắc nhở</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ── Modal 6: Chi tiết phiên sử dụng ────────────────────────── */}
      {detailSession && (
        <div className="admin-modal-overlay" onClick={() => setDetailSession(null)}>
          <div
            className="admin-modal-box session-detail-modal-card"
            style={{ maxWidth: "760px", width: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-with-badge">
                <h3 className="modal-title">
                  Chi tiết phiên sử dụng #{detailSession.confirmationCode}
                </h3>
                <span className="modal-sub-tag">
                  Phòng: {detailSession.roomCode} ({detailSession.roomName})
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDetailSession(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body-scrollable" style={{ gap: "14px" }}>
              {/* Trạng thái & Mã nhận */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    Mã xác nhận nhận phòng
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "1px" }}>
                    {detailSession.confirmationCode}
                  </div>
                </div>
                <div>
                  {detailSession.status === "Đang sử dụng" ? (
                    <span className="status-badge badge-in-use">
                      <span className="status-dot in-use-pulse" />
                      Đang sử dụng
                    </span>
                  ) : detailSession.status === "Chờ nhận phòng" ? (
                    <span className="status-badge badge-scheduled">
                      <ClockIcon size={14} />
                      Chờ nhận phòng
                    </span>
                  ) : detailSession.status === "Hoàn thành" ? (
                    <span className="status-badge badge-completed">
                      <CheckCircleIcon size={14} />
                      Đã trả phòng
                    </span>
                  ) : (
                    <span className="status-badge badge-cancelled">
                      <BanIcon size={14} />
                      {detailSession.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin phòng & Người mượn */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Phòng &amp; Vị trí</div>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{detailSession.roomName}</strong>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Mã: {detailSession.roomCode} • {detailSession.building || "Khu A"} - {detailSession.floor || "Tầng 1"}
                  </div>
                </div>

                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Người sử dụng</div>
                  <strong style={{ fontSize: "13px", color: "#0f172a" }}>{detailSession.userFullName}</strong>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    MSSV: {detailSession.userCardCode || "—"} • {detailSession.userEmail || "—"}
                  </div>
                </div>
              </div>

              {/* Thời gian & Hoạt động */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Thời gian ca mượn</div>
                  <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                    <strong>Bắt đầu:</strong> {formatDateTime(detailSession.startAt)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#334155" }}>
                    <strong>Kết thúc:</strong> {formatDateTime(detailSession.endAt)}
                  </div>
                </div>

                <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Hoạt động &amp; Quy mô</div>
                  <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                    {detailSession.activityName || "Học tập nhóm / Tự học"}
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Số lượng: <strong>{detailSession.guestCount}</strong> người
                  </div>
                </div>
              </div>

              {/* Ghi chú khảo sát / bàn giao (nếu có) */}
              {detailSession.staffNote && (
                <div style={{ padding: "10px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "11px", color: "#166534", fontWeight: 700 }}>Ghi chú bàn giao / Trả phòng</div>
                  <div style={{ fontSize: "12px", color: "#15803d", marginTop: "2px" }}>
                    {detailSession.staffNote}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            {(() => {
              const detailReminders = reminders.filter((r) => r.sessionId === detailSession.id);
              const detailReminderCount = detailReminders.length;

              return (
                <div
                  className="modal-footer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: "8px",
                    paddingTop: "14px",
                    borderTop: "1px solid #e2e8f0",
                    width: "100%",
                  }}
                >
                  {/* Left: Lập biên bản & Nhắc nhở */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn-modal-action-violation"
                      onClick={() => {
                        const s = detailSession;
                        setDetailSession(null);
                        openViolationModalForSession(s);
                      }}
                      title="Lập biên bản vi phạm cho phiên này"
                      style={{ padding: "7px 11px", fontSize: "12px", whiteSpace: "nowrap" }}
                    >
                      <AlertTriangleIcon size={14} />
                      <span>Lập biên bản</span>
                    </button>

                    {detailSession.status !== "Hoàn thành" && detailSession.status !== "Đã hủy" && (
                      <button
                        type="button"
                        className={`btn-modal-action-remind ${detailReminderCount >= 3
                          ? "is-danger"
                          : detailReminderCount > 0
                            ? "is-active"
                            : ""
                          }`}
                        onClick={() => {
                          const s = detailSession;
                          setDetailSession(null);
                          openReminderModal(s);
                        }}
                        title={
                          detailReminderCount >= 3
                            ? "Cảnh báo: Đã nhắc nhở 3 lần!"
                            : `Gửi nhắc nhở nội quy (Hiện tại: ${detailReminderCount}/3 lần)`
                        }
                        style={{ padding: "7px 11px", fontSize: "12px", whiteSpace: "nowrap" }}
                      >
                        <BellRingIcon size={14} />
                        <span>
                          {detailReminderCount >= 3
                            ? "Quá 3 lần"
                            : detailReminderCount > 0
                              ? `Nhắc (${detailReminderCount}/3)`
                              : "Nhắc nhở"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Right: Thao tác theo trạng thái + Đóng */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      onClick={() => setDetailSession(null)}
                      style={{ padding: "7px 12px", fontSize: "12px", whiteSpace: "nowrap" }}
                    >
                      Đóng
                    </button>

                    {detailSession.status === "Chờ nhận phòng" && (() => {
                      const checkInStatus = getCheckInStatus(detailSession);
                      return (
                        <>
                          <button
                            type="button"
                            className="btn-danger-outline flex items-center gap-1.5"
                            onClick={() => {
                              const s = detailSession;
                              setDetailSession(null);
                              openCancelSessionModal(s);
                            }}
                            title="Hủy ca mượn phòng (Đột xuất, khẩn cấp, No-show...)"
                            style={{
                              padding: "7px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: "6px",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <BanIcon size={14} />
                            <span>Hủy ca mượn</span>
                          </button>

                          <button
                            type="button"
                            className={`btn-modal-submit flex items-center gap-1.5 ${!checkInStatus.allowed ? "is-disabled" : ""}`}
                            disabled={!checkInStatus.allowed}
                            onClick={() => {
                              const s = detailSession;
                              setDetailSession(null);
                              handleCheckIn(s);
                            }}
                            style={{
                              padding: "7px 13px",
                              fontSize: "12px",
                              opacity: checkInStatus.allowed ? 1 : 0.55,
                              cursor: checkInStatus.allowed ? "pointer" : "not-allowed",
                              whiteSpace: "nowrap",
                            }}
                            title={checkInStatus.allowed ? "Xác nhận nhận phòng" : checkInStatus.reason}
                          >
                            <ShieldCheckIcon size={14} />
                            <span>Xác nhận Check-in</span>
                          </button>
                        </>
                      );
                    })()}

                    {detailSession.status === "Đang sử dụng" && (
                      <button
                        type="button"
                        className="btn-modal-submit flex items-center gap-1.5"
                        style={{
                          background: "#2563eb",
                          borderColor: "#1d4ed8",
                          padding: "7px 13px",
                          fontSize: "12px",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => {
                          const s = detailSession;
                          setDetailSession(null);
                          openCheckoutModal(s);
                        }}
                      >
                        <ClipboardListIcon size={14} />
                        <span>Khảo sát &amp; Trả phòng</span>
                      </button>
                    )}

                    {detailSession.status === "Hoàn thành" && (
                      <span className="done-pill" style={{ padding: "6px 12px", fontSize: "12px", whiteSpace: "nowrap" }}>
                        <CheckCircleIcon size={14} /> Đã trả phòng
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Hủy ca mượn phòng (Sự cố, khẩn cấp, No-show) */}
      {cancelTargetSession && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => !isSubmittingCancelSession && setCancelTargetSession(null)}
        >
          <div
            className="admin-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-session-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "540px" }}
          >
            <div className="modal-header">
              <h3 id="cancel-session-modal-title" className="modal-title color-red">
                <BanIcon size={18} className="mr-1 inline-block" /> Hủy ca mượn phòng {cancelTargetSession.roomCode}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancelTargetSession(null)}
                disabled={isSubmittingCancelSession}
                aria-label="Đóng hộp thoại"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-prompt-text">
                Thao tác này áp dụng khi có sự cố phòng, trường hợp khẩn cấp hoặc người mượn không đến. Phòng sẽ được giải phóng ngay lập tức trên lịch, ghi lịch sử duyệt và <strong>gửi email kèm thông báo</strong> đến người đặt.
              </p>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  margin: "12px 0 16px",
                  fontSize: "13px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px 16px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>Phòng mượn:</span>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>
                    {cancelTargetSession.roomName} ({cancelTargetSession.roomCode})
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>Người chịu trách nhiệm:</span>
                  <div style={{ fontWeight: 600, color: "#0f172a" }}>
                    {cancelTargetSession.userFullName} {cancelTargetSession.userCardCode ? `(${cancelTargetSession.userCardCode})` : ""}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>Khung giờ:</span>
                  <div style={{ fontWeight: 500, color: "#334155" }}>
                    {cancelTargetSession.startPeriodName
                      ? `Tiết ${cancelTargetSession.startPeriodName} → ${cancelTargetSession.endPeriodName}`
                      : `${formatDateTime(cancelTargetSession.startAt)} → ${formatDateTime(cancelTargetSession.endAt)}`}
                  </div>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>Mục đích / Hoạt động:</span>
                  <div style={{ fontWeight: 500, color: "#334155" }}>
                    {cancelTargetSession.activityName || "Học tập / Nghiên cứu"}
                  </div>
                </div>
              </div>

              <div className="form-group-admin">
                <label style={{ fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                  Lý do hủy phòng (*):
                </label>
                <select
                  className="admin-select"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                  value={cancelSessionReasonPreset}
                  onChange={(e) => setCancelSessionReasonPreset(e.target.value)}
                  disabled={isSubmittingCancelSession}
                >
                  {CANCEL_SESSION_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset === "OTHER" ? "Lý do khác (tự nhập chi tiết)..." : preset}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={3}
                  className="admin-textarea"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                  placeholder={
                    cancelSessionReasonPreset === "OTHER"
                      ? "Nhập lý do cụ thể gửi đến người mượn..."
                      : "Ghi chú thêm chi tiết (tùy chọn)..."
                  }
                  value={customCancelSessionDetail}
                  onChange={(e) => setCustomCancelSessionDetail(e.target.value)}
                  disabled={isSubmittingCancelSession}
                />
              </div>

              <div
                className="confirm-sub-note note-warning"
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#991b1b",
                  fontSize: "12px",
                }}
              >
                <AlertTriangleIcon size={15} style={{ flexShrink: 0, marginTop: "2px", color: "#dc2626" }} />
                <span>
                  Hệ thống sẽ gửi email chính thức và thông báo trực tiếp đến người đặt để họ nắm rõ lý do và chủ động sắp xếp kế hoạch.
                </span>
              </div>
            </div>

            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}
            >
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setCancelTargetSession(null)}
                disabled={isSubmittingCancelSession}
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                className="btn-confirm-reject"
                onClick={handleCancelSessionSubmit}
                disabled={isSubmittingCancelSession}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isSubmittingCancelSession ? "Đang xử lý..." : "Xác nhận hủy phòng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
