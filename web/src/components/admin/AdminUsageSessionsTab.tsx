import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  fetchUsageSessions,
  fetchUsageSummary,
  checkInSession,
  checkOutSession,
  cancelNoShow,
  type UsageSessionItem,
  type UsageSummary,
} from "../../lib/usage";
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
} from "../Icon";
import {
  fetchViolationTypes,
  recordViolation,
  type ViolationTypeItem,
} from "../../lib/violations";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminUsageSessionsTab({ onNotify }: Props) {
  const { confirm } = useConfirm();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

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
  const [isSubmittingViolation, setIsSubmittingViolation] = useState(false);

  const openViolationModalForSession = async (session: UsageSessionItem) => {
    setViolationTargetSession(session);
    try {
      const types = await fetchViolationTypes();
      setViolationTypes(types);
      if (types.length > 0) {
        setViolationTypeId(types[0].id);
        setViolationSeverity(types[0].severity);
        setViolationPenalty(types[0].defaultPenalty || "Cảnh cáo");
        if (types[0].severity >= 3) setViolationRestrictDays(14);
        else if (types[0].severity === 2) setViolationRestrictDays(3);
        else setViolationRestrictDays(0);
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
      await recordViolation({
        userId: violationTargetSession.userId,
        violationTypeId: violationTypeId,
        usageSessionId: violationTargetSession.id,
        description: violationDesc.trim(),
        severity: violationSeverity,
        penaltyApplied: violationPenalty.trim() || "Cảnh cáo",
        restrictDays: violationRestrictDays,
      });
      onNotify(
        `Đã lập biên bản vi phạm thành công cho ${violationTargetSession.userFullName}!`,
        "success"
      );
      setShowViolationModal(false);
      setViolationTargetSession(null);
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Không thể lưu biên bản vi phạm.",
        "warning"
      );
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

  // Hủy do No-show
  const handleCancelNoShow = async (session: UsageSessionItem) => {
    const timeRange = session.startPeriodName
      ? `${session.startPeriodName} → ${session.endPeriodName}`
      : `${formatDateTime(session.startAt)} → ${formatDateTime(session.endAt)}`;

    const confirmed = await confirm({
      title: "Xác nhận hủy phiên mượn phòng (No-show)",
      message: `Bạn có chắc chắn muốn hủy phiên mượn phòng của ${session.userFullName}?`,
      subMessage:
        "Lý do: Quá 15 phút không đến nhận phòng (No-show). Thao tác này sẽ hủy phiên, giải phóng phòng ngay lập tức và ghi nhận lịch sử xử lý.",
      itemDetails: [
        {
          label: "Phòng mượn",
          value: `${session.roomName} (${session.roomCode})`,
        },
        {
          label: "Người chịu trách nhiệm",
          value: session.userFullName,
          badge: session.userCardCode
            ? `MSSV: ${session.userCardCode}`
            : undefined,
        },
        {
          label: "Lịch đăng ký",
          value: timeRange,
        },
        {
          label: "Mục đích sử dụng",
          value: session.activityName || "Học tập / Nghiên cứu",
        },
      ],
      type: "danger",
      confirmText: "Xác nhận hủy phiên",
      cancelText: "Không, giữ lại",
    });

    if (!confirmed) {
      return;
    }
    try {
      await cancelNoShow(
        session.id,
        "Hủy do quá 15 phút không đến nhận phòng (No-show)"
      );
      onNotify(`Đã hủy phiên phòng ${session.roomCode} do No-show.`, "info");
      loadData();
    } catch (err: any) {
      onNotify(
        err.response?.data?.message || "Hủy phiên không thành công.",
        "warning"
      );
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

      const conditionMsg =
        checkoutChecklist.roomCondition === "Bảo trì"
          ? "Phòng đã chuyển sang trạng thái Bảo trì để kỹ thuật kiểm tra sự cố."
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
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
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
  }, [sessions, statusFilter, searchTerm]);

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
            <span className="stat-sub">Đơn đã duyệt chờ Check-in</span>
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
              className={`pill-btn pill-inuse ${
                statusFilter === "Đang sử dụng" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Đang sử dụng")}
            >
              <span className="pill-dot inuse" />
              Đang sử dụng ({sessions.filter((s) => s.status === "Đang sử dụng").length})
            </button>
            <button
              type="button"
              className={`pill-btn pill-scheduled ${
                statusFilter === "Chờ nhận phòng" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Chờ nhận phòng")}
            >
              <span className="pill-dot scheduled" />
              Chờ nhận phòng ({sessions.filter((s) => s.status === "Chờ nhận phòng").length})
            </button>
            <button
              type="button"
              className={`pill-btn pill-completed ${
                statusFilter === "Hoàn thành" ? "active" : ""
              }`}
              onClick={() => setStatusFilter("Hoàn thành")}
            >
              <span className="pill-dot completed" />
              Đã trả phòng ({sessions.filter((s) => s.status === "Hoàn thành").length})
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
                {filteredSessions.map((session) => (
                  <tr key={session.id} className={`status-row-${session.status}`}>
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
                    <td className="cell-actions text-right">
                      <div className="action-button-group">
                        {session.status === "Chờ nhận phòng" && (
                          <>
                            <button
                              type="button"
                              className="btn-table-action btn-checkin"
                              onClick={() => handleCheckIn(session)}
                              title="Xác nhận nhận phòng ngay"
                            >
                              <ShieldCheckIcon size={14} />
                              <span>Check-in</span>
                            </button>

                            <button
                              type="button"
                              className="btn-table-action btn-noshow"
                              onClick={() => handleCancelNoShow(session)}
                              title="Hủy do quá 15 phút không đến nhận phòng"
                            >
                              <BanIcon size={14} />
                            </button>
                          </>
                        )}

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

                        <button
                          type="button"
                          className="btn-table-action btn-action-violation-sm"
                          onClick={() => openViolationModalForSession(session)}
                          title="Lập biên bản vi phạm cho người mượn phiên này"
                        >
                          <AlertTriangleIcon size={13} />
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

            <div className="modal-form">
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
                  className={`condition-radio-card ${
                    checkoutChecklist.roomCondition === "Trống" ? "active" : ""
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
                      ✓ Phòng bình thường (Trống)
                    </span>
                    <span className="radio-desc">
                      Phòng sạch sẽ, thiết bị tốt, sẵn sàng đón lượt đặt tiếp theo.
                    </span>
                  </div>
                </label>

                <label
                  className={`condition-radio-card ${
                    checkoutChecklist.roomCondition === "Bảo trì" ? "active danger" : ""
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
                      ⚠ Cần bảo trì / Xử lý sự cố
                    </span>
                    <span className="radio-desc">
                      Phát hiện hỏng hóc thiết bị hoặc sự cố cần khóa phòng để kỹ thuật xử lý.
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

              <div className="modal-footer-actions">
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
                Nhập mã xác nhận nhận phòng được cấp trong đơn đăng ký (Ví dụ:{" "}
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

            <form onSubmit={handleRecordViolationSubmit} className="modal-form">
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
                      if (vt.severity >= 3) setViolationRestrictDays(14);
                      else if (vt.severity === 2) setViolationRestrictDays(3);
                      else setViolationRestrictDays(0);
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

              <div className="modal-footer-actions">
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
    </div>
  );
}
