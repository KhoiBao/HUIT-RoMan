import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  DotsIcon,
  InfoIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";
import { useAuth } from "../../auth/AuthContext";
import {
  describeCancelSource,
  describeCancelReason,
  fetchAutoApprovalSettingApi,
  updateAutoApprovalSettingApi,
  approvePendingBookingsApi,
  rejectPendingBookingsApi,
  bulkCancelBookingsApi,
  bulkApproveBookingsApi,
  cancelBookingByStaffApi,
  cancelBookingDetailByStaffApi,
  type AutoApprovalSetting,
} from "../../lib/booking";
import { ApprovalHistoryModal } from "../ApprovalHistoryModal";
import AdminPagination from "../common/AdminPagination";
import { formatDateTime24h } from "../../lib/dateTimeFormat";

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
  approvedByUserId?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalMode?: string | null;
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
  /** Mã lý do hủy: CHANGE_PLAN | NO_LONGER_NEEDED | OTHER | NO_SHOW. NULL = lịch cũ */
  cancelReason?: string | null;
  cancelReasonDetail?: string | null;
  /** Nguồn hủy: STUDENT | AUTO | STAFF. NULL = không ghi nhận */
  cancelSource?: string | null;
  approvedByUserId?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalMode?: string | null;
  details: BookingDetail[];
}

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
  /** Chỉ Admin/Manager được đổi chế độ duyệt của toàn hệ thống */
  canManageAutoApproval?: boolean;
}

/** Phòng dùng cho select điều chỉnh khi duyệt */
interface AdjustRoomOption {
  id: number;
  roomCode: string;
  roomName: string;
  capacity: number;
}

/** Chuyển ISO UTC sang giá trị cho input datetime-local (giờ máy). */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminBookingApprovalTab({
  onNotify,
  canManageAutoApproval = false,
}: Props) {
  const { alert, confirm } = useConfirm();
  const { user: currentUser } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "guest_desc" | "user_asc">("newest");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
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

  // Điều chỉnh phòng/thời gian khi duyệt (tùy chọn)
  const [adjustRoomId, setAdjustRoomId] = useState<string>("");
  const [adjustStartAt, setAdjustStartAt] = useState<string>("");
  const [adjustEndAt, setAdjustEndAt] = useState<string>("");
  const [adjustRooms, setAdjustRooms] = useState<AdjustRoomOption[]>([]);

  // Chế độ duyệt tự động
  const [autoSetting, setAutoSetting] = useState<AutoApprovalSetting | null>(null);
  const [autoLoading, setAutoLoading] = useState<boolean>(true);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  /** "on" = đang chờ xác nhận bật kèm duyệt yêu cầu tồn */
  const [autoConfirm, setAutoConfirm] = useState<"on" | null>(null);

  // Bulk Selection State
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);

  // Cancel / Revoke Approval State (Hủy duyệt toàn bộ / từng phòng / hàng loạt)
  const CANCEL_REASON_PRESETS = [
    "Phòng cần sửa chữa, bảo trì thiết bị hoặc cơ sở vật chất đột xuất",
    "Khu học thuật tạm đóng cửa theo chỉ đạo của nhà trường",
    "Trùng lịch sự kiện, hội thảo hoặc thi cử của nhà trường",
    "Người mượn liên hệ xin hủy / thay đổi kế hoạch",
    "Quản lý điều chỉnh lại kế hoạch vận hành phòng",
    "OTHER",
  ];
  const [cancelTarget, setCancelTarget] = useState<{
    type: "booking" | "detail" | "all_pending" | "bulk_selected";
    id?: number;
    booking?: BookingItem;
    detail?: BookingDetail;
    title: string;
    count?: number;
  } | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>(CANCEL_REASON_PRESETS[0]);
  const [customCancelDetail, setCustomCancelDetail] = useState<string>("");
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

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

  useEffect(() => {
    if (!approveTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submittingAction) setApproveTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [approveTarget, submittingAction]);

  // Mở hộp thoại duyệt chi tiết: nạp danh sách phòng + khôi phục thời gian gốc
  useEffect(() => {
    if (!approveTarget || approveTarget.type !== "detail" || !approveTarget.detail) {
      setAdjustRoomId("");
      setAdjustStartAt("");
      setAdjustEndAt("");
      return;
    }
    setAdjustRoomId("");
    setAdjustStartAt(toLocalInputValue(approveTarget.detail.startAt));
    setAdjustEndAt(toLocalInputValue(approveTarget.detail.endAt));
    let active = true;
    api
      .get("/api/Rooms")
      .then((res) => {
        if (!active) return;
        const list = res.data?.data || res.data || [];
        setAdjustRooms(
          list.map((r: any) => ({
            id: r.id,
            roomCode: r.roomCode,
            roomName: r.name,
            capacity: r.capacity,
          }))
        );
      })
      .catch(() => {
        if (active) setAdjustRooms([]);
      });
    return () => {
      active = false;
    };
  }, [approveTarget]);

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
      onNotify("Không thể tải danh sách yêu cầu đặt phòng từ máy chủ.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoSetting = async () => {
    try {
      setAutoLoading(true);
      setAutoSetting(await fetchAutoApprovalSettingApi());
    } catch (err) {
      console.error("Failed to load auto approval setting:", err);
    } finally {
      setAutoLoading(false);
    }
  };

  const formatFailuresSummary = (
    failures?: Array<{ bookingId: number; activityName?: string | null; reason: string }>
  ) => {
    if (!failures || failures.length === 0) return "";
    const firstFailures = failures
      .slice(0, 3)
      .map((f) => `Đơn #${f.bookingId}${f.activityName ? ` (${f.activityName})` : ""}: ${f.reason}`)
      .join("; ");
    const remaining = failures.length > 3 ? ` và ${failures.length - 3} đơn khác` : "";
    return ` (Chi tiết: ${firstFailures}${remaining})`;
  };

  const applyAutoSetting = async (enabled: boolean, approvePending: boolean) => {
    try {
      setAutoSaving(true);
      setAutoSetting(await updateAutoApprovalSettingApi(enabled));

      if (approvePending) {
        const result = await approvePendingBookingsApi();
        onNotify(
          result.failedCount > 0
            ? `Đã bật duyệt tự động. Duyệt được ${result.approvedCount} yêu cầu, ${result.failedCount} yêu cầu không thể duyệt${formatFailuresSummary(result.failures)}.`
            : `Đã bật duyệt tự động và duyệt ${result.approvedCount} yêu cầu.`,
          result.failedCount > 0 ? "warning" : "success"
        );
      } else {
        onNotify(
          enabled ? "Đã bật duyệt tự động." : "Đã tắt duyệt tự động.",
          "success"
        );
      }

      setAutoConfirm(null);
      await Promise.all([fetchBookings(), fetchAutoSetting()]);
    } catch (err: any) {
      onNotify(
        err.response?.data?.message ||
          err.message ||
          "Không thể cập nhật chế độ duyệt tự động.",
        "warning"
      );
    } finally {
      setAutoSaving(false);
    }
  };

  const handleToggleAuto = (next: boolean) => {
    if (!autoSetting || autoSaving) return;
    if (next && autoSetting.pendingCount > 0) {
      setAutoConfirm("on");
      return;
    }
    void applyAutoSetting(next, false);
  };

  useEffect(() => {
    fetchBookings();
    fetchAutoSetting();
  }, []);

  // Quick stats
  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "Chờ duyệt").length;
    const pendingSecondLevel = bookings.filter(
      (b) => b.status === "Chờ duyệt cấp 2"
    ).length;
    const approved = bookings.filter(
      (b) => b.status === "Đã duyệt" || b.status === "Duyệt một phần"
    ).length;
    const rejected = bookings.filter((b) => b.status === "Từ chối").length;
    return { total, pending, pendingSecondLevel, approved, rejected };
  }, [bookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    let list = bookings.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (dateFilter) {
        const dStr = dateFilter;
        const matchesRequest = (b.requestedAt || "").startsWith(dStr) || (b.createdAt || "").startsWith(dStr);
        const matchesDetail = b.details.some((d) => (d.startAt || "").startsWith(dStr));
        if (!matchesRequest && !matchesDetail) return false;
      }
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

    list = [...list].sort((a, b) => {
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "guest_desc") return (b.guestCount || 0) - (a.guestCount || 0);
      if (sortBy === "user_asc") {
        const nameA = a.userFullName || a.userName || "";
        const nameB = b.userFullName || b.userName || "";
        return nameA.localeCompare(nameB);
      }
      return b.id - a.id;
    });

    return list;
  }, [bookings, statusFilter, searchTerm, dateFilter, sortBy]);

  // Phân trang
  const pagedBookings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page, pageSize]);

  // Yêu cầu chờ duyệt kế tiếp trong hàng đợi (để duyệt liên tiếp)
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
        // Backend trả message đúng ngữ cảnh: phòng đặc biệt sẽ chuyển sang chờ duyệt cấp 2
        onNotify(
          res.data?.message ||
            (nextPendingId
              ? `Đã duyệt yêu cầu #${bookingId}. Còn yêu cầu #${nextPendingId} đang chờ.`
              : `Đã duyệt đặt phòng #${bookingId} thành công!`),
          "success"
        );
        setApproveTarget(null);
        await fetchBookings();
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
            `Đã từ chối yêu cầu #${rejectTarget.id} với lý do: "${rejectionReason.trim()}"`,
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
          : err.message || "Lỗi xử lý từ chối yêu cầu từ máy chủ.");
      onNotify(msg, "warning");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Approve individual room detail (có thể kèm điều chỉnh phòng/thời gian)
  const handleApproveDetail = async (
    detailId: number,
    roomCode: string,
    adjustment?: { newRoomId?: number; newStartAt?: string; newEndAt?: string }
  ) => {
    try {
      setApprovingDetailId(detailId);
      const res = await api.patch(`/api/Bookings/details/${detailId}/approve`, {
        decision: "Đã duyệt",
        rejectionReason: "",
        ...(adjustment?.newRoomId ? { newRoomId: adjustment.newRoomId } : {}),
        ...(adjustment?.newStartAt ? { newStartAt: adjustment.newStartAt } : {}),
        ...(adjustment?.newEndAt ? { newEndAt: adjustment.newEndAt } : {}),
      });
      if (res.data?.success) {
        onNotify(
          res.data?.message || `Đã duyệt phòng ${roomCode} thành công!`,
          "success"
        );
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
            const anySecondLevel = updatedDetails.some(
              (d) => d.status === "Chờ duyệt cấp 2"
            );
            const anyProcessed = updatedDetails.some(
              (d) => d.status !== "Chờ duyệt" && d.status !== "Chờ duyệt cấp 2"
            );
            const nextStatus = allApproved
              ? "Đã duyệt"
              : allRejected
              ? "Từ chối"
              : anySecondLevel
              ? "Chờ duyệt cấp 2"
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

  // Xác nhận duyệt chi tiết từ hộp thoại: validate điều chỉnh trước khi gọi API
  const handleConfirmApproveDetail = () => {
    const detail = approveTarget?.detail;
    if (!detail) return;
    const startVal = adjustStartAt ? new Date(adjustStartAt) : null;
    const endVal = adjustEndAt ? new Date(adjustEndAt) : null;
    if ((startVal && !endVal) || (!startVal && endVal)) {
      void alert({
        title: "Thiếu thời gian điều chỉnh",
        message:
          "Vui lòng nhập cả giờ bắt đầu và giờ kết thúc khi điều chỉnh thời gian.",
        type: "warning",
      });
      return;
    }
    if (startVal && endVal && endVal.getTime() <= startVal.getTime()) {
      void alert({
        title: "Thời gian không hợp lệ",
        message: "Giờ kết thúc phải sau giờ bắt đầu.",
        type: "warning",
      });
      return;
    }
    const adjustment: { newRoomId?: number; newStartAt?: string; newEndAt?: string } = {};
    const selectedRoomId = Number(adjustRoomId);
    if (selectedRoomId && selectedRoomId !== detail.roomId) {
      adjustment.newRoomId = selectedRoomId;
    }
    if (startVal && endVal) {
      const startIso = startVal.toISOString();
      const endIso = endVal.toISOString();
      if (startVal.getTime() !== new Date(detail.startAt).getTime()) {
        adjustment.newStartAt = startIso;
      }
      if (endVal.getTime() !== new Date(detail.endAt).getTime()) {
        adjustment.newEndAt = endIso;
      }
    }
    handleApproveDetail(detail.id, detail.roomCode, adjustment);
  };

  // Open Cancel / Revoke Approval Modal
  const openCancelModal = (
    type: "booking" | "detail" | "all_pending" | "bulk_selected",
    id?: number,
    title = "",
    extra?: { booking?: BookingItem; detail?: BookingDetail; count?: number }
  ) => {
    setCancelTarget({
      type,
      id,
      title,
      booking: extra?.booking,
      detail: extra?.detail,
      count: extra?.count,
    });
    setCancelReasonPreset(CANCEL_REASON_PRESETS[0]);
    setCustomCancelDetail("");
  };

  // Submit Cancel / Revoke Approval
  const submitCancelApproval = async () => {
    if (!cancelTarget) return;

    const finalReason =
      cancelReasonPreset === "OTHER"
        ? customCancelDetail.trim()
        : customCancelDetail.trim()
        ? `${cancelReasonPreset}: ${customCancelDetail.trim()}`
        : cancelReasonPreset;

    if (!finalReason) {
      await alert({
        title: "Thiếu lý do hủy duyệt",
        message: "Vui lòng chọn hoặc nhập lý do hủy duyệt để gửi thông báo cho sinh viên.",
        type: "warning",
      });
      return;
    }

    try {
      setSubmittingCancel(true);

      if (cancelTarget.type === "booking" && cancelTarget.id) {
        await cancelBookingByStaffApi(cancelTarget.id, finalReason);
        onNotify(`Đã hủy duyệt toàn bộ đơn #${cancelTarget.id} thành công!`, "info");
      } else if (cancelTarget.type === "detail" && cancelTarget.id) {
        await cancelBookingDetailByStaffApi(cancelTarget.id, finalReason);
        onNotify(`Đã hủy duyệt phòng #${cancelTarget.id} thành công!`, "info");
      } else if (cancelTarget.type === "all_pending") {
        const res = await rejectPendingBookingsApi(finalReason);
        onNotify(
          res.failedCount > 0
            ? `Đã từ chối/hủy ${res.rejectedCount} đơn đang chờ (${res.failedCount} đơn không thể xử lý${formatFailuresSummary(res.failures)}).`
            : `Đã từ chối/hủy toàn bộ ${res.rejectedCount} đơn đang chờ duyệt thành công!`,
          res.failedCount > 0 ? "warning" : "info"
        );
      } else if (cancelTarget.type === "bulk_selected") {
        if (selectedBookingIds.length === 0) return;
        const res = await bulkCancelBookingsApi(selectedBookingIds, finalReason);
        onNotify(
          res.failedCount > 0
            ? `Đã hủy duyệt ${res.cancelledCount} đơn đã chọn (${res.failedCount} đơn không thể hủy${formatFailuresSummary(res.failures)}).`
            : `Đã hủy duyệt toàn bộ ${res.cancelledCount} đơn đã chọn thành công!`,
          res.failedCount > 0 ? "warning" : "info"
        );
        setSelectedBookingIds([]);
      }

      setCancelTarget(null);
      await fetchBookings();
    } catch (err: any) {
      console.error("Cancel approval error:", err);
      onNotify(
        err.response?.data?.message || err.message || "Lỗi xử lý hủy duyệt từ máy chủ.",
        "warning"
      );
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Bulk Approve Selected
  const handleBulkApproveSelected = async () => {
    if (selectedBookingIds.length === 0) return;
    const pendingSelected = bookings
      .filter((b) => selectedBookingIds.includes(b.id) && b.status === "Chờ duyệt")
      .map((b) => b.id);

    if (pendingSelected.length === 0) {
      onNotify("Không có đơn nào ở trạng thái Chờ duyệt trong các đơn đã chọn.", "warning");
      return;
    }

    const confirmed = await confirm({
      title: "Duyệt hàng loạt đơn đã chọn",
      message: `Bạn có chắc chắn muốn DUYỆT ${pendingSelected.length} đơn đặt phòng đã chọn?`,
      confirmText: "Duyệt đơn đã chọn",
      type: "info",
    });
    if (!confirmed) return;

    try {
      setSubmittingAction(true);
      const res = await bulkApproveBookingsApi(pendingSelected);
      onNotify(
        res.failedCount > 0
          ? `Đã duyệt ${res.approvedCount} đơn (${res.failedCount} đơn không thể duyệt${formatFailuresSummary(res.failures)}).`
          : `Đã duyệt thành công toàn bộ ${res.approvedCount} đơn đã chọn!`,
        res.failedCount > 0 ? "warning" : "success"
      );
      setSelectedBookingIds([]);
      await fetchBookings();
    } catch (err: any) {
      onNotify(err.response?.data?.message || err.message || "Lỗi duyệt hàng loạt.", "warning");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Approve all pending
  const handleApproveAllPending = async () => {
    if (stats.pending === 0) {
      onNotify("Không có đơn nào đang chờ duyệt.", "info");
      return;
    }

    const confirmed = await confirm({
      title: "Duyệt toàn bộ yêu cầu",
      message: `Bạn có chắc chắn muốn DUYỆT TOÀN BỘ ${stats.pending} đơn đặt phòng đang chờ duyệt?`,
      confirmText: "Duyệt tất cả",
      type: "info",
    });
    if (!confirmed) return;

    try {
      setSubmittingAction(true);
      const res = await approvePendingBookingsApi();
      onNotify(
        res.failedCount > 0
          ? `Đã duyệt ${res.approvedCount} đơn (${res.failedCount} đơn không thể duyệt${formatFailuresSummary(res.failures)}).`
          : `Đã duyệt toàn bộ ${res.approvedCount} đơn đang chờ duyệt thành công!`,
        res.failedCount > 0 ? "warning" : "success"
      );
      await fetchBookings();
    } catch (err: any) {
      onNotify(err.response?.data?.message || err.message || "Lỗi duyệt toàn bộ đơn.", "warning");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Selection toggle
  const toggleSelectBooking = (id: number) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isAllPageSelected =
    pagedBookings.length > 0 &&
    pagedBookings.every((b) => selectedBookingIds.includes(b.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(pagedBookings.map((b) => b.id));
      setSelectedBookingIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = pagedBookings.map((b) => b.id);
      setSelectedBookingIds((prev) => Array.from(new Set([...prev, ...pageIds])));
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
      case "Chờ duyệt cấp 2":
        return (
          <span className="admin-status-pill pill-pending">
            <HourglassIcon size={12} className="mr-1 inline-block" /> Chờ duyệt
            cấp 2
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

      {/* Duyệt tự động */}
      {canManageAutoApproval && (
        <div className="auto-approve-panel">
          <div className="auto-approve-text">
            <h3 className="auto-approve-title">
              <ZapIcon size={16} /> Duyệt tự động
            </h3>
            <span className="auto-approve-status-row">
              {autoLoading ? (
                <span className="auto-approve-pill is-loading">Đang tải...</span>
              ) : (
                <>
                  <span
                    className={`auto-approve-pill ${
                      autoSetting?.enabled ? "is-on" : "is-off"
                    }`}
                  >
                    <span className="auto-approve-dot" aria-hidden="true" />
                    {autoSetting?.enabled ? "Đang bật" : "Đang tắt"}
                  </span>
                  <span className="auto-approve-state-text">
                    {autoSetting?.enabled
                      ? "Yêu cầu mới được duyệt ngay"
                      : "Yêu cầu mới chờ duyệt thủ công"}
                  </span>
                  {autoSetting && autoSetting.pendingCount > 0 && (
                    <span className="auto-approve-pill is-pending">
                      {autoSetting.pendingCount} yêu cầu chờ duyệt
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoSetting?.enabled ?? false}
            aria-label="Bật hoặc tắt duyệt tự động"
            className={`toggle-switch ${
              autoSetting?.enabled ? "toggle-switch-on" : ""
            }`}
            onClick={() => handleToggleAuto(!autoSetting?.enabled)}
            disabled={autoLoading || autoSaving || !autoSetting}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      )}

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
          onClick={() => {
            setStatusFilter("Chờ duyệt");
            setPage(1);
          }}
        >
          <span className="stat-label color-amber">
            <HourglassIcon size={12} className="mr-1 inline-block" /> Cần duyệt ngay
          </span>
          <span className="stat-val color-amber">{stats.pending}</span>
        </div>
        {stats.pendingSecondLevel > 0 && (
          <div
            className={`admin-stat-card cursor-pointer ${
              statusFilter === "Chờ duyệt cấp 2" ? "stat-active" : ""
            }`}
            onClick={() => {
              setStatusFilter("Chờ duyệt cấp 2");
              setPage(1);
            }}
          >
            <span className="stat-label color-amber">
              <HourglassIcon size={12} className="mr-1 inline-block" /> Chờ duyệt cấp 2
            </span>
            <span className="stat-val color-amber">{stats.pendingSecondLevel}</span>
          </div>
        )}
        <div
          className={`admin-stat-card cursor-pointer ${
            statusFilter === "Đã duyệt" ? "stat-active" : ""
          }`}
          onClick={() => {
            setStatusFilter("Đã duyệt");
            setPage(1);
          }}
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
          onClick={() => {
            setStatusFilter("Từ chối");
            setPage(1);
          }}
        >
          <span className="stat-label color-red">
            <XIcon size={12} className="mr-1 inline-block" /> Đã từ chối
          </span>
          <span className="stat-val color-red">{stats.rejected}</span>
        </div>
      </div>

      {/* Quick Bulk Action Bar */}
      {stats.pending > 0 && (
        <div
          className="admin-bulk-quick-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#92400e" }}>
            <HourglassIcon size={16} />
            <span>
              Đang có <strong>{stats.pending}</strong> yêu cầu đặt phòng chờ xét duyệt
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-action-approve"
              style={{ fontSize: "13px", padding: "6px 12px" }}
              onClick={handleApproveAllPending}
              disabled={submittingAction}
              title="Duyệt toàn bộ các đơn đang chờ"
            >
              <CheckCircleIcon size={14} /> Duyệt toàn bộ ({stats.pending})
            </button>
            <button
              type="button"
              className="btn-action-cancel-approval"
              style={{ fontSize: "13px", padding: "6px 12px" }}
              onClick={() =>
                openCancelModal("all_pending", undefined, "Hủy duyệt / Từ chối toàn bộ đơn đang chờ", {
                  count: stats.pending,
                })
              }
              disabled={submittingAction || submittingCancel}
              title="Hủy duyệt / Từ chối toàn bộ các đơn đang chờ"
            >
              <XIcon size={14} /> Hủy duyệt toàn bộ ({stats.pending})
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <SearchIcon size={18} className="search-icon-muted" />
          <input
            type="text"
            placeholder="Tìm theo Mã đặt phòng (#ID), MSSV, Tên người mượn, Tên phòng, Hoạt động..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        <div className="admin-status-filters">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "Chờ duyệt", label: "Chờ duyệt" },
            { id: "Chờ duyệt cấp 2", label: "Chờ duyệt cấp 2" },
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
              onClick={() => {
                setStatusFilter(item.id);
                setPage(1);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CalendarIcon size={15} className="search-icon-muted" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#334155",
                backgroundColor: "#ffffff",
                outline: "none",
              }}
              title="Lọc theo ngày mượn / ngày sử dụng"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="newest">Mới nhất (Mặc định)</option>
            <option value="oldest">Cũ nhất</option>
            <option value="guest_desc">Số người tham gia giảm dần</option>
            <option value="user_asc">Người mượn A-Z</option>
          </select>

          {(searchTerm || statusFilter !== "ALL" || dateFilter || sortBy !== "newest") && (
            <button
              type="button"
              className="filter-pill-btn"
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setDateFilter("");
                setSortBy("newest");
                setPage(1);
              }}
              title="Xóa tất cả bộ lọc và hoàn tác sắp xếp"
            >
              <RefreshCwIcon size={12} />
              <span>Đặt lại</span>
            </button>
          )}
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
            Không có yêu cầu đặt phòng nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px",
              marginBottom: "10px",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={isAllPageSelected}
                onChange={toggleSelectAllPage}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span>Chọn tất cả trên trang này ({pagedBookings.length} đơn)</span>
            </label>
            {selectedBookingIds.length > 0 && (
              <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
                Đã chọn tổng cộng {selectedBookingIds.length} đơn
              </span>
            )}
          </div>

          <div className="admin-booking-cards-list">
            {pagedBookings.map((b) => {
            const isExpanded = expandedId === b.id;
            const isPending = b.status === "Chờ duyệt";
            const isSecondLevelPending = b.status === "Chờ duyệt cấp 2";

            return (
              <div
                key={b.id}
                id={`booking-card-${b.id}`}
                className={`admin-booking-card-item ${
                  isPending || isSecondLevelPending ? "border-highlight-pending" : ""
                }`}
              >
                <div
                  className="booking-card-main-header"
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  title="Bấm vào để xem chi tiết / thu gọn các phòng đăng ký"
                >
                  <div className="booking-card-id-col">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.includes(b.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectBooking(b.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Chọn đơn #${b.id}`}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span className="booking-code-badge">#{b.id}</span>
                    </div>
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
                        <DoorIcon size={14} />
                        <strong>{b.details.length} phòng</strong>
                        {b.details.length > 0
                          ? ` (${b.details.map((d) => d.roomCode).join(", ")})`
                          : ""}
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
                    {b.approvedByName &&
                      (b.status === "Đã duyệt" ||
                        b.status === "Duyệt một phần" ||
                        b.status === "Chờ duyệt cấp 2") && (
                        <p className="booking-approver-line">
                          {b.status === "Chờ duyệt cấp 2"
                            ? "Duyệt cấp 1 bởi"
                            : "Duyệt bởi"}{" "}
                          <strong>{b.approvedByName}</strong>
                          {b.approvedAt ? ` • ${formatDateTime(b.approvedAt)}` : ""}
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
                        Đã nhận phòng lúc {formatDateTime24h(b.checkedInAt)}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="booking-card-actions-col" onClick={(e) => e.stopPropagation()}>
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
                            openRejectModal("booking", b.id, `Đặt phòng #${b.id} - ${b.activityName}`)
                          }
                          disabled={submittingAction}
                          title="Từ chối yêu cầu đặt phòng"
                        >
                          <XIcon size={14} /> Từ chối
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className={`btn-table-more ${rowMenu?.key === b.id ? "active" : ""}`}
                      title="Thêm chức năng"
                      aria-label="Thêm chức năng"
                      onClick={(e) => toggleRowMenu(b.id, e.currentTarget)}
                    >
                      <DotsIcon size={17} />
                    </button>
                  </div>
                </div>

                {rowMenu?.key === b.id &&
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
                          setExpandedId(isExpanded ? null : b.id);
                        }}
                      >
                        <InfoIcon size={14} />
                        <span>{isExpanded ? "Thu gọn danh sách phòng" : "Chi tiết đặt phòng"}</span>
                      </button>

                      <button
                        type="button"
                        role="menuitem"
                        className="row-actions-menu-item accent-indigo"
                        onClick={() => {
                          setRowMenu(null);
                          setHistoryTarget(b);
                        }}
                      >
                        <HistoryIcon size={14} />
                        <span>Lịch sử duyệt</span>
                      </button>

                      {!isPending &&
                        (b.status === "Đã duyệt" || b.status === "Duyệt một phần") &&
                        !b.checkedInAt && (
                          <button
                            type="button"
                            role="menuitem"
                            className="row-actions-menu-item danger"
                            onClick={() => {
                              setRowMenu(null);
                              openCancelModal(
                                "booking",
                                b.id,
                                `Hủy duyệt toàn bộ đơn #${b.id} (${b.activityName || "Mượn phòng"})`,
                                { booking: b }
                              );
                            }}
                            disabled={submittingAction || submittingCancel}
                          >
                            <XIcon size={14} />
                            <span>Hủy duyệt toàn bộ</span>
                          </button>
                        )}
                    </div>,
                    document.body
                  )}

                {/* Expanded Details list */}
                {isExpanded && (
                  <div className="booking-card-expanded-drawer">
                    <h4 className="expanded-rooms-title">
                      <DoorIcon size={16} /> Danh sách phòng đăng ký ({b.details.length} phòng):
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
                          {b.details.map((detail) => {
                            const canDecide =
                              detail.status === "Chờ duyệt" ||
                              detail.status === "Chờ duyệt cấp 2";
                            const isL2Approver =
                              detail.approvedByUserId === currentUser?.id;
                            return (
                            <tr
                              key={detail.id}
                              className={canDecide ? "admin-clickable-row" : ""}
                              onClick={() => {
                                if (canDecide) {
                                  setApproveTarget({
                                    type: "detail",
                                    booking: b,
                                    detail,
                                  });
                                }
                              }}
                              title={canDecide ? "Bấm vào dòng để xét duyệt phòng này" : undefined}
                            >
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
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                  {getStatusBadge(detail.status)}
                                  {detail.rejectionReason && (
                                    <div className="detail-reject-reason-tooltip" title={detail.rejectionReason}>
                                      Lý do: {detail.rejectionReason}
                                    </div>
                                  )}
                                  {detail.approvedByName &&
                                    detail.status === "Đã duyệt" && (
                                      <div className="detail-approver-line">
                                        Duyệt bởi {detail.approvedByName}
                                        {detail.approvedAt
                                          ? ` • ${formatDateTime(detail.approvedAt)}`
                                          : ""}
                                      </div>
                                    )}
                                  {detail.approvedByName &&
                                    detail.status === "Chờ duyệt cấp 2" && (
                                      <div className="detail-approver-line">
                                        Duyệt cấp 1 bởi {detail.approvedByName}
                                        {detail.approvedAt
                                          ? ` • ${formatDateTime(detail.approvedAt)}`
                                          : ""}
                                      </div>
                                    )}
                                </div>
                              </td>
                              <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
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
                                ) : detail.status === "Chờ duyệt cấp 2" ? (
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
                                      disabled={
                                        approvingDetailId === detail.id ||
                                        submittingAction ||
                                        isL2Approver
                                      }
                                      title={
                                        isL2Approver
                                          ? "Bạn đã duyệt cấp 1 cho phòng này — cần người khác thực hiện duyệt cấp 2"
                                          : "Duyệt cấp 2 cho phòng này"
                                      }
                                    >
                                      {approvingDetailId === detail.id ? (
                                        <span>Đang duyệt...</span>
                                      ) : (
                                        <>
                                          <CheckIcon size={12} /> Duyệt cấp 2
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
                                ) : detail.status === "Đã duyệt" && !b.checkedInAt ? (
                                  <div className="table-row-actions">
                                    <button
                                      type="button"
                                      className="btn-mini-cancel-approval"
                                      onClick={() =>
                                        openCancelModal(
                                          "detail",
                                          detail.id,
                                          `Hủy duyệt phòng ${detail.roomCode} (đơn #${b.id})`,
                                          { booking: b, detail }
                                        )
                                      }
                                      disabled={submittingCancel}
                                      title="Hủy duyệt riêng phòng này"
                                    >
                                      <XIcon size={12} /> Hủy duyệt phòng
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500, paddingRight: "8px" }}>—</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <AdminPagination
          currentPage={page}
          totalItems={filteredBookings.length}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
          itemLabel="yêu cầu đặt phòng"
        />

        {/* Floating Bulk Action Bar */}
        {selectedBookingIds.length > 0 && (
          <div className="admin-floating-bulk-bar">
            <div className="admin-floating-bulk-count">
              <span>
                Đã chọn: <strong>{selectedBookingIds.length}</strong> đơn đặt phòng
              </span>
            </div>
            <div className="admin-floating-bulk-actions">
              <button
                type="button"
                className="btn-bulk-approve"
                onClick={handleBulkApproveSelected}
                disabled={submittingAction || submittingCancel}
                title="Duyệt các đơn Chờ duyệt đã chọn"
              >
                <CheckCircleIcon size={15} /> Duyệt đơn đã chọn
              </button>
              <button
                type="button"
                className="btn-bulk-cancel"
                onClick={() =>
                  openCancelModal(
                    "bulk_selected",
                    undefined,
                    `Hủy duyệt ${selectedBookingIds.length} đơn đã chọn`,
                    { count: selectedBookingIds.length }
                  )
                }
                disabled={submittingAction || submittingCancel}
                title="Hủy duyệt / Thu hồi phê duyệt các đơn đã chọn"
              >
                <XIcon size={15} /> Hủy duyệt đơn đã chọn
              </button>
              <button
                type="button"
                className="btn-bulk-dismiss"
                onClick={() => setSelectedBookingIds([])}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </>
      )}

      {/* Xác nhận bật duyệt tự động khi còn yêu cầu chờ */}
      {autoConfirm === "on" && autoSetting && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => !autoSaving && setAutoConfirm(null)}
        >
          <div
            className="admin-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auto-approve-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="auto-approve-modal-title" className="modal-title">
                <ZapIcon size={18} className="mr-1" /> Bật duyệt tự động
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAutoConfirm(null)}
                aria-label="Đóng hộp thoại xác nhận duyệt tự động"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-prompt-text">
                Có {autoSetting.pendingCount} yêu cầu đang chờ duyệt. Duyệt luôn
                các yêu cầu này?
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setAutoConfirm(null)}
                disabled={autoSaving}
                autoFocus
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-confirm-approve"
                onClick={() => void applyAutoSetting(true, true)}
                disabled={autoSaving}
              >
                {autoSaving
                  ? "Đang duyệt..."
                  : `Bật & duyệt ${autoSetting.pendingCount} yêu cầu`}
              </button>
            </div>
          </div>
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
                  ? `yêu cầu #${approveTarget.booking.id}`
                  : `phòng ${approveTarget.detail?.roomCode}${
                      approveTarget.detail?.status === "Chờ duyệt cấp 2"
                        ? " (cấp 2)"
                        : ""
                    }`}
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
                Kiểm tra lại thông tin trước khi duyệt. Sau khi duyệt, yêu cầu không
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

              {approveTarget.type === "detail" && (
                <div className="form-group-admin" style={{ marginTop: "14px" }}>
                  <label
                    style={{
                      fontWeight: 600,
                      color: "#334155",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Điều chỉnh khi duyệt (tùy chọn):
                  </label>
                  <select
                    className="admin-select"
                    style={{ width: "100%", marginBottom: "8px" }}
                    value={adjustRoomId}
                    onChange={(e) => setAdjustRoomId(e.target.value)}
                    title="Đổi phòng khác cho yêu cầu này nếu cần"
                  >
                    <option value="">
                      Giữ nguyên phòng {approveTarget.detail?.roomCode}
                    </option>
                    {adjustRooms
                      .filter((r) => r.id !== approveTarget.detail?.roomId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.roomCode} — {r.roomName} ({r.capacity} người)
                        </option>
                      ))}
                  </select>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      type="datetime-local"
                      className="admin-select"
                      style={{ flex: "1 1 180px" }}
                      value={adjustStartAt}
                      onChange={(e) => setAdjustStartAt(e.target.value)}
                      aria-label="Giờ bắt đầu điều chỉnh"
                    />
                    <input
                      type="datetime-local"
                      className="admin-select"
                      style={{ flex: "1 1 180px" }}
                      value={adjustEndAt}
                      onChange={(e) => setAdjustEndAt(e.target.value)}
                      aria-label="Giờ kết thúc điều chỉnh"
                    />
                  </div>
                </div>
              )}

              <div className="confirm-sub-note note-warning">
                <AlertTriangleIcon size={16} />
                <span>
                  Thao tác này không thể hoàn tác. Nếu chọn nhầm, hãy từ chối
                  yêu cầu và yêu cầu người dùng đặt lại.
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
                    : `Duyệt & xem yêu cầu #${nextPendingBooking.id}`}
                </button>
              )}
              <button
                type="button"
                className="btn-confirm-approve"
                onClick={() => {
                  if (approveTarget.type === "booking") {
                    handleApproveBooking(approveTarget.booking.id);
                  } else if (approveTarget.detail) {
                    handleConfirmApproveDetail();
                  }
                }}
                disabled={
                  submittingAction ||
                  approvingBookingId !== null ||
                  approvingDetailId !== null
                }
              >
                {approvingBookingId || approvingDetailId
                  ? "Đang duyệt..."
                  : "Xác nhận duyệt"}
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

      {/* Cancel / Revoke Approval Modal */}
      {cancelTarget && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => !submittingCancel && setCancelTarget(null)}
        >
          <div
            className="admin-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-approval-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h3 id="cancel-approval-modal-title" className="modal-title color-red">
                <AlertTriangleIcon size={18} className="mr-1 inline-block" /> {cancelTarget.title}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCancelTarget(null)}
                disabled={submittingCancel}
                aria-label="Đóng hộp thoại"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-prompt-text">
                {cancelTarget.type === "all_pending"
                  ? `Bạn đang chuẩn bị HỦY DUYỆT / TỪ CHỐI toàn bộ ${
                      cancelTarget.count || stats.pending
                    } đơn đang chờ duyệt. Thao tác này sẽ giải phóng phòng và gửi thông báo/email cho sinh viên.`
                  : cancelTarget.type === "bulk_selected"
                  ? `Bạn đang chuẩn bị HỦY DUYỆT ${
                      cancelTarget.count || selectedBookingIds.length
                    } đơn đã chọn. Thao tác này sẽ thu hồi phê duyệt, giải phóng các phòng đã được giữ và gửi thông báo cho sinh viên.`
                  : cancelTarget.type === "booking"
                  ? `Thao tác này sẽ thu hồi phê duyệt, HỦY TOÀN BỘ các phòng trong đơn #${cancelTarget.id}, giải phóng phòng trống trên lịch và thông báo cho sinh viên.`
                  : `Thao tác này sẽ thu hồi phê duyệt riêng phòng này, giải phóng lịch phòng và thông báo lý do cho sinh viên.`}
              </p>

              <div className="form-group-admin" style={{ marginTop: "14px" }}>
                <label style={{ fontWeight: 600, color: "#334155", display: "block", marginBottom: "6px" }}>
                  Lý do hủy duyệt (*):
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
                  value={cancelReasonPreset}
                  onChange={(e) => setCancelReasonPreset(e.target.value)}
                  disabled={submittingCancel}
                >
                  {CANCEL_REASON_PRESETS.map((preset) => (
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
                    cancelReasonPreset === "OTHER"
                      ? "Nhập lý do cụ thể gửi đến người mượn..."
                      : "Ghi chú thêm chi tiết (tùy chọn)..."
                  }
                  value={customCancelDetail}
                  onChange={(e) => setCustomCancelDetail(e.target.value)}
                  disabled={submittingCancel}
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
                  background: "#fef3c7",
                  borderRadius: "6px",
                  color: "#92400e",
                  fontSize: "12px",
                }}
              >
                <AlertTriangleIcon size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>
                  Lý do hủy sẽ được lưu vào Lịch sử duyệt và gửi trực tiếp qua thông báo hệ thống / email đến người mượn.
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
                onClick={() => setCancelTarget(null)}
                disabled={submittingCancel}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-confirm-reject"
                onClick={submitCancelApproval}
                disabled={submittingCancel}
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
                {submittingCancel ? "Đang xử lý..." : "Xác nhận hủy duyệt"}
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
