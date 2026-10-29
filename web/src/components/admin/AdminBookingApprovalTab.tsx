import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import {
  ClipboardCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SearchIcon,
  ClockIcon,
  UsersIcon,
  DoorIcon,
  CalendarIcon,
  RefreshCwIcon,
  HourglassIcon,
  CheckIcon,
  XIcon,
  ZapIcon,
  SlashIcon,
  HistoryIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import { describeCancelSource, describeCancelReason } from "../../lib/booking";
import { ApprovalHistoryModal } from "../ApprovalHistoryModal";

export interface BookingDetail {
  id: number;
  roomId: number;
  roomName: string;
  roomCode: string;
  startAt: string;
  endAt: string;
  startPeriodId?: number;
  startPeriodName?: string;
  endPeriodId?: number;
  endPeriodName?: string;
  guestCount: number;
  purpose: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface BookingItem {
  id: number;
  activityName: string;
  purpose: string;
  guestCount: number;
  status: string;
  rejectionReason?: string;
  note?: string;
  requestedAt: string;
  createdAt: string;
  userId: number;
  userName: string;
  userFullName: string;
  /** Thời điểm check-in (UTC ISO). NULL = chưa nhận phòng */
  checkedInAt?: string | null;
  /** Mã lý do hủy: CHANGE_PLAN | NO_LONGER_NEEDED | OTHER | NO_SHOW. NULL = đơn cũ */
  cancelReason?: string | null;
  cancelReasonDetail?: string | null;
  /** Nguồn hủy: STUDENT | AUTO | STAFF. NULL = không ghi nhận */
  cancelSource?: string | null;
  details: BookingDetail[];
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminBookingApprovalTab({ onNotify }: Props) {
  const { alert } = useConfirm();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<{
    type: "booking" | "detail";
    id: number;
    title: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [approvingBookingId, setApprovingBookingId] = useState<number | null>(null);
  const [approvingDetailId, setApprovingDetailId] = useState<number | null>(null);

  // Confirm sheet before approving — duyệt là hành động không thể hoàn tác
  const [approveTarget, setApproveTarget] = useState<{
    type: "booking" | "detail";
    booking: BookingItem;
    detail?: BookingDetail;
  } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BookingItem | null>(null);

  useEffect(() => {
    if (!approveTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingAction) setApproveTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [approveTarget, submittingAction]);

  // Fetch bookings from API
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/Bookings");
      const list = res.data?.data || res.data || [];
      // Sort newest first
      setBookings(list.sort((a: BookingItem, b: BookingItem) => b.id - a.id));
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      onNotify("Không thể tải danh sách đơn đặt phòng từ máy chủ.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Quick stats
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "Chờ duyệt").length;
    const approved = bookings.filter(
      (b) => b.status === "Đã duyệt" || b.status === "Duyệt một phần"
    ).length;
    const rejected = bookings.filter((b) => b.status === "Từ chối").length;
    return { total, pending, approved, rejected };
  }, [bookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesId = `#${b.id}`.includes(q) || String(b.id).includes(q);
        const matchesUser =
          (b.userFullName || "").toLowerCase().includes(q) ||
          (b.userName || "").toLowerCase().includes(q);
        const matchesActivity = (b.activityName || "").toLowerCase().includes(q);
        const matchesRoom = b.details.some(
          (d) =>
            d.roomCode.toLowerCase().includes(q) ||
            d.roomName.toLowerCase().includes(q)
        );
        if (!matchesId && !matchesUser && !matchesActivity && !matchesRoom)
          return false;
      }
      return true;
    });
  }, [bookings, statusFilter, searchTerm]);

  // Đơn chờ duyệt kế tiếp trong hàng đợi (để duyệt liên tiếp)
  const nextPendingBooking = useMemo(() => {
    if (!approveTarget || approveTarget.type !== "booking") return null;
    const queue = bookings.filter((b) => b.status === "Chờ duyệt");
    const index = queue.findIndex((b) => b.id === approveTarget.booking.id);
    return index >= 0 ? queue[index + 1] ?? null : null;
  }, [approveTarget, bookings]);

  // Handle Approve whole booking
  const handleApproveBooking = async (bookingId: number, advance = false) => {
    const pendingQueue = bookings.filter((b) => b.status === "Chờ duyệt");
    const currentIndex = pendingQueue.findIndex((b) => b.id === bookingId);
    const nextPendingId =
      currentIndex >= 0 ? pendingQueue[currentIndex + 1]?.id : undefined;
    try {
      setApprovingBookingId(bookingId);
      const res = await api.patch(`/api/Bookings/${bookingId}/approve`, {
        decision: "Đã duyệt",
        rejectionReason: "",
      });
      if (res.data?.success) {
        onNotify(
          nextPendingId
            ? `Đã duyệt đơn #${bookingId}. Còn đơn #${nextPendingId} đang chờ.`
            : `Đã duyệt đặt phòng #${bookingId} thành công!`,
          "success"
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: "Đã duyệt",
                  details: b.details.map((d) => ({ ...d, status: "Đã duyệt" })),
                }
              : b
          )
        );
        setApproveTarget(null);
        fetchBookings();
        if (advance && nextPendingId) {
          window.setTimeout(() => {
            document
              .getElementById(`booking-card-${nextPendingId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 200);
        }
      } else {
        onNotify(res.data?.message || "Duyệt đặt phòng không thành công.", "warning");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : err.response?.status === 403
          ? "Bạn không có quyền thực hiện thao tác duyệt này."
          : err.message || "Lỗi xử lý duyệt đặt phòng từ hệ thống.");
      onNotify(msg, "warning");
    } finally {
      setApprovingBookingId(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (
    type: "booking" | "detail",
    id: number,
    title: string
  ) => {
    setRejectTarget({ type, id, title });
    setRejectionReason("");
  };

  // Submit Reject
  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      await alert({
        title: "Thiếu lý do từ chối",
        message: "Vui lòng nhập lý do từ chối để thông báo cho người đặt phòng.",
        type: "warning",
      });
      return;
    }
    try {
      setSubmittingAction(true);
      if (rejectTarget.type === "booking") {
        const res = await api.patch(`/api/Bookings/${rejectTarget.id}/approve`, {
          decision: "Từ chối",
          rejectionReason: rejectionReason.trim(),
        });
        if (res.data?.success) {
          onNotify(
            `Đã từ chối đơn #${rejectTarget.id} với lý do: "${rejectionReason.trim()}"`,
            "info"
          );
        }
      } else {
        const res = await api.patch(
          `/api/Bookings/details/${rejectTarget.id}/approve`,
          {
            decision: "Từ chối",
            rejectionReason: rejectionReason.trim(),
          }
        );
        if (res.data?.success) {
          onNotify(`Đã từ chối chi tiết phòng #${rejectTarget.id}`, "info");
        }
      }
      setRejectTarget(null);
      await fetchBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : err.response?.status === 403
          ? "Bạn không có quyền thực hiện thao tác từ chối này."
          : err.message || "Lỗi xử lý từ chối đơn từ máy chủ.");
      onNotify(msg, "warning");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Approve individual room detail
  const handleApproveDetail = async (detailId: number, roomCode: string) => {
    try {
      setApprovingDetailId(detailId);
      const res = await api.patch(`/api/Bookings/details/${detailId}/approve`, {
        decision: "Đã duyệt",
        rejectionReason: "",
      });
      if (res.data?.success) {
        onNotify(`Đã duyệt phòng ${roomCode} thành công!`, "success");
        setBookings((prev) =>
          prev.map((b) => {
            const hasDetail = b.details.some((d) => d.id === detailId);
            if (!hasDetail) return b;
            const updatedDetails = b.details.map((d) =>
              d.id === detailId ? { ...d, status: "Đã duyệt" } : d
            );
            const allApproved = updatedDetails.every(
              (d) => d.status === "Đã duyệt"
            );
            const allRejected = updatedDetails.every(
              (d) => d.status === "Từ chối"
            );
            const anyProcessed = updatedDetails.some(
              (d) => d.status !== "Chờ duyệt"
            );
            const nextStatus = allApproved
              ? "Đã duyệt"
              : allRejected
              ? "Từ chối"
              : anyProcessed
              ? "Duyệt một phần"
              : b.status;
            return { ...b, status: nextStatus, details: updatedDetails };
          })
        );
        setApproveTarget(null);
        fetchBookings();
      } else {
        onNotify(
          res.data?.message || "Duyệt chi tiết không thành công.",
          "warning"
        );
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err.response?.status === 401
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : err.response?.status === 403
          ? "Bạn không có quyền thực hiện thao tác duyệt này."
          : err.message || "Lỗi phê duyệt chi tiết phòng.");
      onNotify(msg, "warning");
    } finally {
      setApprovingDetailId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Chờ duyệt":
        return (
          <span className="admin-status-pill pill-pending">
            <HourglassIcon size={12} className="mr-1 inline-block" /> Chờ duyệt
          </span>
        );
      case "Đã duyệt":
        return (
          <span className="admin-status-pill pill-approved">
            <CheckIcon size={12} className="mr-1 inline-block" /> Đã duyệt
          </span>
        );
      case "Duyệt một phần":
        return (
          <span className="admin-status-pill pill-partial">
            <ZapIcon size={12} className="mr-1 inline-block" /> Duyệt một phần
          </span>
        );
      case "Từ chối":
        return (
          <span className="admin-status-pill pill-rejected">
            <XIcon size={12} className="mr-1 inline-block" /> Từ chối
          </span>
        );
      case "Đã hủy":
        return (
          <span className="admin-status-pill pill-cancelled">
            <SlashIcon size={12} className="mr-1 inline-block" /> Đã hủy
          </span>
        );
      case "Hoàn thành":
        return (
          <span className="admin-status-pill pill-completed">
            <CheckCircleIcon size={12} className="mr-1 inline-block" /> Hoàn thành
          </span>
        );
      case "Đang sử dụng":
        return (
          <span className="admin-status-pill pill-inuse">
            <ClockIcon size={12} className="mr-1 inline-block" /> Đang sử dụng
          </span>
        );
      case "Chờ nhận phòng":
        return (
          <span className="admin-status-pill pill-pending">
            <HourglassIcon size={12} className="mr-1 inline-block" /> Chờ nhận phòng
          </span>
        );
      default:
        return <span className="admin-status-pill">{status}</span>;
    }
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return "—";
    try {
      const d = new Date(dtStr);
      return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")} ngày ${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="admin-subtab-container">
      {/* 1. Header Toolbar & Stats */}
      <div className="admin-subtab-header">
        <div>
          <h2 className="admin-subtab-title">
            <ClipboardCheckIcon size={24} className="icon-blue-glow" />
            Duyệt đăng ký mượn phòng Thư viện & Giảng đường
          </h2>
          <p className="admin-subtab-subtitle">
            Tiếp nhận, kiểm tra lịch và xét duyệt phiếu mượn từ sinh viên và giảng viên.
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-refresh"
          onClick={fetchBookings}
          disabled={loading}
          title="Tải lại dữ liệu mới nhất từ máy chủ"
        >
          <RefreshCwIcon size={14} />
          <span>{loading ? "Đang tải..." : "Làm mới dữ liệu"}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="admin-stat-row">
        <div className="admin-stat-card">
          <span className="stat-label">Tổng số phiếu mượn</span>
          <span className="stat-val">{stats.total}</span>
        </div>
        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Chờ duyệt" ? "stat-active" : ""
          }`}
          onClick={() => setStatusFilter("Chờ duyệt")}
        >
          <span className="stat-label color-amber">
            <HourglassIcon size={12} className="mr-1 inline-block" /> Cần duyệt ngay
          </span>
          <span className="stat-val color-amber">{stats.pending}</span>
        </div>
        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Đã duyệt" ? "stat-active" : ""
          }`}
          onClick={() => setStatusFilter("Đã duyệt")}
        >
          <span className="stat-label color-green">
            <CheckIcon size={12} className="mr-1 inline-block" /> Đã duyệt
          </span>
          <span className="stat-val color-green">{stats.approved}</span>
        </div>
        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Từ chối" ? "stat-active" : ""
          }`}
          onClick={() => setStatusFilter("Từ chối")}
        >
          <span className="stat-label color-red">
            <XIcon size={12} className="mr-1 inline-block" /> Đã từ chối
          </span>
          <span className="stat-val color-red">{stats.rejected}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn (#ID), MSSV, Tên người mượn, Tên phòng, Hoạt động..."
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

        <div className="admin-status-filters">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "Chờ duyệt", label: "Chờ duyệt" },
            { id: "Đã duyệt", label: "Đã duyệt" },
            { id: "Từ chối", label: "Đã từ chối" },
            { id: "Đã hủy", label: "Đã hủy" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`filter-pill-btn ${
                statusFilter === item.id ? "active-pill" : ""
              }`}
              onClick={() => setStatusFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Booking List Table */}
      {loading ? (
        <div className="admin-loading-state">
          <div className="spinner-dots" />
          <p>Đang tải danh sách phiếu mượn phòng từ API...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="admin-empty-state">
          <AlertTriangleIcon size={36} className="text-muted" />
          <p className="empty-title">Không tìm thấy phiếu mượn nào</p>
          <p className="empty-desc">
            Không có đơn đặt phòng nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="admin-booking-cards-list">
          {filteredBookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const isPending = b.status === "Chờ duyệt";

            return (
              <div
                key={b.id}
                id={`booking-card-${b.id}`}
                className={`admin-booking-card-item ${
                  isPending ? "border-highlight-pending" : ""
                }`}
              >
                <div className="booking-card-main-header">
                  <div className="booking-card-id-col">
                    <span className="booking-code-badge">#{b.id}</span>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="booking-card-info-col">
                    <h3 className="booking-activity-name">
                      {b.activityName || "Mượn phòng học tập / nghiên cứu"}
                    </h3>
                    <div className="booking-meta-row">
                      <span className="meta-item">
                        <UsersIcon size={14} />
                        <strong>{b.userFullName || b.userName}</strong> (Mã:{" "}
                        {b.userName})
                      </span>
                      <span className="meta-sep">•</span>
                      <span className="meta-item">
                        Quy mô: <strong>{b.guestCount} người</strong>
                      </span>
                      <span className="meta-sep">•</span>
                      <span className="meta-item">
                        <ClockIcon size={14} />
                        Gửi lúc: {formatDateTime(b.requestedAt || b.createdAt)}
                      </span>
                    </div>
                    {b.purpose && (
                      <p className="booking-purpose-snippet">
                        <strong>Mục đích:</strong> {b.purpose}
                      </p>
                    )}
                    {b.rejectionReason && (
                      <div className="booking-reject-notice">
                        <strong>Lý do từ chối:</strong> {b.rejectionReason}
                      </div>
                    )}
                    {b.status === "Đã hủy" && (
                      <div className="booking-cancel-notice">
                        <strong>{describeCancelSource(b).label}:</strong>{" "}
                        {describeCancelReason(b)}
                      </div>
                    )}
                    {b.checkedInAt && (
                      <div className="booking-checkedin-notice">
                        Đã nhận phòng lúc{" "}
                        {new Date(b.checkedInAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="booking-card-actions-col">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          className="btn-action-approve"
                          onClick={() =>
                            setApproveTarget({ type: "booking", booking: b })
                          }
                          disabled={approvingBookingId === b.id || submittingAction}
                          title="Duyệt đặt phòng này"
                        >
                          {approvingBookingId === b.id ? (
                            <span>Đang duyệt...</span>
                          ) : (
                            <>
                              <CheckCircleIcon size={16} /> Duyệt đặt phòng
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn-action-reject"
                          onClick={() =>
                            openRejectModal("booking", b.id, `Đơn #${b.id} - ${b.activityName}`)
                          }
                          disabled={submittingAction}
                          title="Từ chối đơn đăng ký"
                        >
                          <XIcon size={14} /> Từ chối
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn-action-expand"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : b.id)
                      }
                    >
                      {isExpanded ? "Thu gọn" : `Xem chi tiết (${b.details.length} phòng)`}
                    </button>

                    <button
                      type="button"
                      className="btn-action-expand"
                      onClick={() => setHistoryTarget(b)}
                      title="Xem lịch sử duyệt của đơn này"
                    >
                      <HistoryIcon size={13} /> Lịch sử duyệt
                    </button>
                  </div>
                </div>

                {/* Expanded Details list */}
                {isExpanded && (
                  <div className="booking-card-expanded-drawer">
                    <h4 className="expanded-rooms-title">
                      <DoorIcon size={16} /> Danh sách phòng đăng ký trong đơn ({b.details.length} phòng):
                    </h4>

                    <div className="admin-table-responsive expanded-details-table-wrap">
                      <table className="admin-data-table expanded-details-table">
                        <thead>
                          <tr>
                            <th>Phòng đăng ký</th>
                            <th>Thời gian / Khung giờ</th>
                            <th>Số lượng</th>
                            <th>Mục đích phòng</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {b.details.map((detail) => (
                            <tr key={detail.id}>
                              <td>
                                <div className="room-info-cell">
                                  <span className="room-code-badge-lg">{detail.roomCode}</span>
                                  <span className="room-name-text">{detail.roomName}</span>
                                </div>
                              </td>
                              <td>
                                <div className="time-info-cell">
                                  <div className="time-line-main">
                                    <ClockIcon size={13} className="text-slate-500" />
                                    <span>
                                      {formatDateTime(detail.startAt)} đến {formatDateTime(detail.endAt)}
                                    </span>
                                  </div>
                                  {detail.startPeriodName && (
                                    <div className="time-line-sub">
                                      <CalendarIcon size={12} className="text-slate-400" />
                                      <span>
                                        Tiết học: {detail.startPeriodName} đến {detail.endPeriodName || detail.startPeriodName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="guest-count-cell">
                                  <UsersIcon size={13} className="text-slate-500" /> {detail.guestCount} người
                                </span>
                              </td>
                              <td>
                                <span className="purpose-cell-text" title={detail.purpose || b.purpose}>
                                  {detail.purpose || b.purpose || "—"}
                                </span>
                              </td>
                              <td>
                                {getStatusBadge(detail.status)}
                                {detail.rejectionReason && (
                                  <div className="detail-reject-reason-tooltip" title={detail.rejectionReason}>
                                    Lý do: {detail.rejectionReason}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {detail.status === "Chờ duyệt" ? (
                                  <div className="table-row-actions">
                                    <button
                                      type="button"
                                      className="btn-mini-approve"
                                      onClick={() =>
                                        setApproveTarget({
                                          type: "detail",
                                          booking: b,
                                          detail,
                                        })
                                      }
                                      disabled={approvingDetailId === detail.id || submittingAction}
                                      title="Duyệt phòng này"
                                    >
                                      {approvingDetailId === detail.id ? (
                                        <span>Đang duyệt...</span>
                                      ) : (
                                        <>
                                          <CheckIcon size={12} /> Duyệt phòng này
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-mini-reject"
                                      onClick={() =>
                                        openRejectModal(
                                          "detail",
                                          detail.id,
                                          `Phòng ${detail.roomCode} (#${detail.id})`
                                        )
                                      }
                                      disabled={submittingAction}
                                      title="Từ chối phòng này"
                                    >
                                      <XIcon size={12} /> Từ chối
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Đã xử lý</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Confirmation Modal — duyệt là hành động không thể hoàn tác */}
      {approveTarget && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => setApproveTarget(null)}
        >
          <div
            className="admin-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="approve-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="approve-modal-title" className="modal-title color-green">
                <CheckCircleIcon size={18} className="mr-1" /> Xác nhận duyệt{" "}
                {approveTarget.type === "booking"
                  ? `đơn #${approveTarget.booking.id}`
                  : `phòng ${approveTarget.detail?.roomCode}`}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setApproveTarget(null)}
                aria-label="Đóng hộp thoại xác nhận duyệt"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-prompt-text">
                Kiểm tra lại thông tin trước khi duyệt. Sau khi duyệt, đơn không
                thể quay lại trạng thái Chờ duyệt và người đặt sẽ nhận thông báo
                ngay.
              </p>

              <div className="confirm-item-details">
                <div className="confirm-detail-row">
                  <span className="confirm-detail-label">Hoạt động:</span>
                  <span className="confirm-detail-value">
                    {approveTarget.booking.activityName ||
                      "Mượn phòng học tập / nghiên cứu"}
                  </span>
                </div>
                <div className="confirm-detail-row">
                  <span className="confirm-detail-label">Người đặt:</span>
                  <span className="confirm-detail-value">
                    {approveTarget.booking.userFullName ||
                      approveTarget.booking.userName}
                    {approveTarget.booking.userName && (
                      <span className="confirm-detail-badge">
                        {approveTarget.booking.userName}
                      </span>
                    )}
                  </span>
                </div>
                {approveTarget.type === "booking" ? (
                  approveTarget.booking.details.map((detail) => (
                    <div className="confirm-detail-row" key={detail.id}>
                      <span className="confirm-detail-label">
                        Phòng {detail.roomCode}:
                      </span>
                      <span className="confirm-detail-value">
                        {formatDateTime(detail.startAt)} →{" "}
                        {formatDateTime(detail.endAt)}
                        {detail.startPeriodName
                          ? ` · Tiết ${detail.startPeriodName}${
                              detail.endPeriodName &&
                              detail.endPeriodName !== detail.startPeriodName
                                ? `–${detail.endPeriodName}`
                                : ""
                            }`
                          : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  approveTarget.detail && (
                    <>
                      <div className="confirm-detail-row">
                        <span className="confirm-detail-label">Phòng:</span>
                        <span className="confirm-detail-value">
                          {approveTarget.detail.roomCode}
                        </span>
                      </div>
                      <div className="confirm-detail-row">
                        <span className="confirm-detail-label">Thời gian:</span>
                        <span className="confirm-detail-value">
                          {formatDateTime(approveTarget.detail.startAt)} →{" "}
                          {formatDateTime(approveTarget.detail.endAt)}
                        </span>
                      </div>
                    </>
                  )
                )}
              </div>

              <div className="confirm-sub-note note-warning">
                <AlertTriangleIcon size={16} />
                <span>
                  Thao tác này không thể hoàn tác. Nếu chọn nhầm, hãy từ chối
                  đơn và yêu cầu người dùng đặt lại.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setApproveTarget(null)}
                autoFocus
              >
                Hủy
              </button>
              {approveTarget.type === "booking" && nextPendingBooking && (
                <button
                  type="button"
                  className="btn-confirm-approve btn-confirm-approve-advance"
                  onClick={() =>
                    handleApproveBooking(approveTarget.booking.id, true)
                  }
                  disabled={submittingAction || approvingBookingId !== null}
                >
                  {approvingBookingId
                    ? "Đang duyệt..."
                    : `Duyệt & xem đơn #${nextPendingBooking.id}`}
                </button>
              )}
              <button
                type="button"
                className="btn-confirm-approve"
                onClick={() => {
                  if (approveTarget.type === "booking") {
                    handleApproveBooking(approveTarget.booking.id);
                  } else if (approveTarget.detail) {
                    handleApproveDetail(
                      approveTarget.detail.id,
                      approveTarget.detail.roomCode
                    );
                  }
                }}
                disabled={submittingAction || approvingBookingId !== null}
              >
                {approvingBookingId ? "Đang duyệt..." : "Xác nhận duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal Dialog */}
      {rejectTarget && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title color-red">
                <XIcon size={18} className="mr-1" /> Từ chối {rejectTarget.title}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRejectTarget(null)}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-prompt-text">
                Vui lòng cung cấp lý do từ chối cụ thể. Lý do này sẽ được gửi tới người đặt phòng để họ nắm rõ:
              </p>

              <div className="form-group-admin">
                <label>Lý do từ chối (* bắt buộc):</label>
                <textarea
                  rows={4}
                  className="admin-textarea"
                  placeholder="Ví dụ: Phòng đã có lịch đột xuất của nhà trường; hoặc chưa đủ điều kiện theo quy định thư viện..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setRejectTarget(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-confirm-reject"
                onClick={submitReject}
                disabled={submittingAction}
              >
                {submittingAction ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Approval history (ai duyệt, khi nào) */}
      {historyTarget && (
        <ApprovalHistoryModal
          isOpen
          bookingId={historyTarget.id}
          activityName={historyTarget.activityName}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
