import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import InfoFooter from "../components/InfoFooter";
import {
  CalendarIcon,
  ClockIcon,
  BuildingIcon,
  UsersIcon,
  PlusIcon,
  InfoIcon,
  BanIcon,
  ZapIcon,
  CheckIcon,
  CopyIcon,
  HourglassIcon,
} from "../components/Icon";
import { checkMyEligibility, type UserEligibility } from "../lib/violations";
import {
  type AvailableRoom,
  type BookingResponse,
  type BookingFormState,
  type BookingDetailItem,
  validateBookingForm,
  buildBookingPayload,
  canCancelBooking,
  formatDetailTimeRange,
  fetchAvailableRoomsApi,
  createBookingApi,
  fetchMyBookingsApi,
  cancelBookingApi,
} from "../lib/booking";
import {
  type Period,
  toISODateString,
  formatVietnameseDate,
  getScheduleStatusBadge,
  fetchPeriodsApi,
} from "../lib/schedule";
import {
  fetchMyUsageSessions,
  checkInSession,
  checkOutSession,
  type UsageSessionItem,
} from "../lib/usage";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: "create" | "my-bookings" (auto-select from ?tab=my-bookings)
  const activeTab: "create" | "my-bookings" =
    searchParams.get("tab") === "my-bookings" ? "my-bookings" : "create";

  // Periods metadata
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Form State
  const defaultDate = searchParams.get("date") || toISODateString(new Date());
  const initialRoomId = Number(searchParams.get("roomId")) || null;
  const initialStartPeriod = Number(searchParams.get("startPeriodId")) || 1;
  const initialEndPeriod = Number(searchParams.get("endPeriodId")) || 2;
  const initialStartTime = searchParams.get("startTime") || "08:00";
  const initialEndTime = searchParams.get("endTime") || "10:30";

  const [form, setForm] = useState<BookingFormState>({
    activityName: "",
    purpose: "",
    guestCount: 30,
    note: "",
    date: defaultDate,
    bookingMode: searchParams.get("startTime") ? "time" : "period",
    startPeriodId: initialStartPeriod,
    endPeriodId: initialEndPeriod,
    startTime: initialStartTime,
    endTime: initialEndTime,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Room search & selection
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>(
    initialRoomId ? [initialRoomId] : []
  );
  const [isSearchingRooms, setIsSearchingRooms] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [myEligibility, setMyEligibility] = useState<UserEligibility | null>(null);

  // My bookings & Usage Sessions tab state
  const [myBookings, setMyBookings] = useState<BookingResponse[]>([]);
  const [myUsageSessions, setMyUsageSessions] = useState<UsageSessionItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // User Check-In / Check-Out states & modals
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState<boolean>(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState<boolean>(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<{
    detail: BookingDetailItem;
    booking: BookingResponse;
    session?: UsageSessionItem;
  } | null>(null);

  // Check-In form state
  const [checkInGuestCount, setCheckInGuestCount] = useState<number>(1);
  const [checkInNote, setCheckInNote] = useState<string>("");
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState<boolean>(false);

  // Check-Out form state
  const [checkOutNote, setCheckOutNote] = useState<string>("");
  const [devicesOk, setDevicesOk] = useState<boolean>(true);
  const [cleaned, setCleaned] = useState<boolean>(true);
  const [lightsOff, setLightsOff] = useState<boolean>(true);
  const [isProcessingCheckOut, setIsProcessingCheckOut] = useState<boolean>(false);

  // Quick Code Check-in state & toast
  const [quickCodeInput, setQuickCodeInput] = useState<string>("");
  const [isQuickCheckingIn, setIsQuickCheckingIn] = useState<boolean>(false);
  const [directCheckingInId, setDirectCheckingInId] = useState<number | null>(null);
  const [usageToast, setUsageToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  // 1. Initial Load: Periods
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const periodList = await fetchPeriodsApi();
        if (!isMounted) return;
        setPeriods(periodList);
      } catch (err: unknown) {
        console.error("Failed to load periods", err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check user violation eligibility
  useEffect(() => {
    checkMyEligibility()
      .then((res) => setMyEligibility(res))
      .catch((err) => console.warn("Could not check eligibility:", err));
  }, []);

  // 2. Search Available Rooms
  async function searchRooms() {
    setIsSearchingRooms(true);
    setSubmitError(null);
    try {
      const results = await fetchAvailableRoomsApi({
        date: form.date,
        startPeriodId: form.bookingMode === "period" ? form.startPeriodId : undefined,
        endPeriodId: form.bookingMode === "period" ? form.endPeriodId : undefined,
        startTime: form.bookingMode === "time" ? `${form.startTime}:00` : undefined,
        endTime: form.bookingMode === "time" ? `${form.endTime}:00` : undefined,
      });

      setAvailableRooms(results);
      setHasSearched(true);

      // Keep only selected rooms that are still available
      setSelectedRoomIds((prev) =>
        prev.filter((id) => results.some((r) => r.roomId === id))
      );
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Lỗi khi tìm phòng trống."
      );
    } finally {
      setIsSearchingRooms(false);
    }
  }

  // Trigger auto search on first load if parameters exist
  useEffect(() => {
    if (!isInitializing) {
      searchRooms();
    }
  }, [isInitializing]);

  // 3. Load My Bookings & My Usage Sessions
  async function loadMyBookings() {
    setIsLoadingBookings(true);
    try {
      const [bookingsList, sessionsList] = await Promise.all([
        fetchMyBookingsApi(),
        fetchMyUsageSessions().catch(() => []),
      ]);
      setMyBookings(bookingsList);
      setMyUsageSessions(sessionsList);
    } catch (err: unknown) {
      console.error("Failed to fetch my bookings/sessions", err);
    } finally {
      setIsLoadingBookings(false);
    }
  }

  useEffect(() => {
    if (activeTab === "my-bookings") {
      loadMyBookings();
    }
  }, [activeTab]);

  // Session map by BookingDetailId for fast O(1) lookup
  const sessionByDetailId = useMemo(() => {
    const map = new Map<number, UsageSessionItem>();
    for (const s of myUsageSessions) {
      map.set(s.bookingDetailId, s);
    }
    return map;
  }, [myUsageSessions]);

  // Quick Code Check-in
  async function handleQuickCodeCheckIn(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = quickCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setUsageToast({
        type: "error",
        text: "Vui lòng nhập mã nhận phòng (VD: HUIT-18549) để check-in hoặc bấm nút '⚡ Check-in nhận phòng ngay' bên dưới.",
      });
      return;
    }

    setIsQuickCheckingIn(true);
    setUsageToast(null);
    try {
      const res = await checkInSession({ confirmationCode: cleanCode });
      setUsageToast({
        type: "success",
        text: `✓ Nhận phòng ${res.roomName} (${res.roomCode}) thành công! Trạng thái phòng chuyển sang 'Đang sử dụng'.`,
      });
      setQuickCodeInput("");
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error
          ? err.message
          : "Mã nhận phòng không hợp lệ hoặc không thuộc quyền sở hữu của bạn.");
      setUsageToast({
        type: "error",
        text: msg,
      });
    } finally {
      setIsQuickCheckingIn(false);
    }
  }

  // Direct 1-Click Check-in without forcing a modal
  async function handleDirectCheckIn(
    detail: BookingDetailItem,
    session?: UsageSessionItem
  ) {
    setDirectCheckingInId(detail.id);
    setUsageToast(null);
    try {
      const res = await checkInSession({
        bookingDetailId: detail.id,
        usageSessionId: session?.id,
        actualGuestCount: detail.guestCount || 1,
        staffNote: "Người dùng tự check-in trên web",
      });
      setUsageToast({
        type: "success",
        text: `✓ Check-in nhận phòng ${res.roomCode} thành công! Phòng đã chuyển sang trạng thái 'Đang sử dụng'.`,
      });
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error ? err.message : "Nhận phòng thất bại.");
      setUsageToast({
        type: "error",
        text: msg,
      });
    } finally {
      setDirectCheckingInId(null);
    }
  }

  function openCheckInModal(
    detail: BookingDetailItem,
    booking: BookingResponse,
    session?: UsageSessionItem
  ) {
    setSelectedDetailItem({ detail, booking, session });
    setCheckInGuestCount(detail.guestCount || 1);
    setCheckInNote("");
    setIsCheckInModalOpen(true);
  }

  async function handleConfirmCheckIn() {
    if (!selectedDetailItem) return;
    setIsProcessingCheckIn(true);
    setUsageToast(null);
    try {
      const res = await checkInSession({
        bookingDetailId: selectedDetailItem.detail.id,
        usageSessionId: selectedDetailItem.session?.id,
        actualGuestCount: checkInGuestCount,
        staffNote: checkInNote.trim() || undefined,
      });
      setIsCheckInModalOpen(false);
      setUsageToast({
        type: "success",
        text: `✓ Check-in nhận phòng ${res.roomCode} thành công! Chúc bạn có buổi học tập/sinh hoạt hiệu quả.`,
      });
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error ? err.message : "Nhận phòng thất bại.");
      setUsageToast({
        type: "error",
        text: msg,
      });
    } finally {
      setIsProcessingCheckIn(false);
    }
  }

  function openCheckOutModal(
    detail: BookingDetailItem,
    booking: BookingResponse,
    session?: UsageSessionItem
  ) {
    setSelectedDetailItem({ detail, booking, session });
    setCheckOutNote("");
    setDevicesOk(true);
    setCleaned(true);
    setLightsOff(true);
    setIsCheckOutModalOpen(true);
  }

  async function handleConfirmCheckOut() {
    if (!selectedDetailItem) return;
    setIsProcessingCheckOut(true);
    setUsageToast(null);
    try {
      const res = await checkOutSession({
        usageSessionId: selectedDetailItem.session?.id,
        bookingDetailId: selectedDetailItem.detail.id,
        roomCondition: devicesOk ? "Trống" : "Bảo trì",
        staffNote: checkOutNote.trim() || undefined,
        devicesOk,
        cleaned,
        lightsOff,
      });
      setIsCheckOutModalOpen(false);
      setUsageToast({
        type: "success",
        text: `✓ Xác nhận trả phòng ${res.roomCode} thành công! Cảm ơn bạn đã giữ gìn vệ sinh và thiết bị phòng.`,
      });
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error ? err.message : "Xác nhận trả phòng thất bại.");
      setUsageToast({
        type: "error",
        text: msg,
      });
    } finally {
      setIsProcessingCheckOut(false);
    }
  }

  // Toggle room selection
  function toggleRoom(roomId: number) {
    setSelectedRoomIds((prev) => {
      if (prev.includes(roomId)) {
        return prev.filter((id) => id !== roomId);
      }
      return [...prev, roomId];
    });
    // Clear room selection error if any
    setErrors((prev) => ({ ...prev, rooms: "" }));
  }

  // Handle Create Booking Submit
  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (myEligibility?.hasActiveRestriction) {
      setSubmitError(
        `Tài khoản đang bị tạm đình chỉ / cấm mượn phòng đến hết ngày ${
          myEligibility.endAt
            ? new Date(myEligibility.endAt).toLocaleDateString("vi-VN")
            : "theo quyết định kỷ luật"
        }. Lý do: ${myEligibility.reason || "Vi phạm quy chế mượn phòng"}.`
      );
      return;
    }

    const validation = validateBookingForm(form, selectedRoomIds);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    const selectedRooms = availableRooms.filter((r) =>
      selectedRoomIds.includes(r.roomId)
    );

    const payload = buildBookingPayload(form, selectedRooms, periods);

    try {
      setIsSubmitting(true);
      const res = await createBookingApi(payload);
      setSubmitSuccess(
        `Đăng ký mượn phòng thành công! Mã đơn: #${res.id}. Trạng thái hiện tại: "Chờ duyệt".`
      );

      // Reset form
      setSelectedRoomIds([]);
      setForm((prev) => ({
        ...prev,
        activityName: "",
        purpose: "",
        note: "",
      }));
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        (err instanceof Error
          ? err.message
          : "Gửi đơn đặt phòng thất bại. Vui lòng kiểm tra lại thông tin.");
      setSubmitError(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Cancel Booking
  async function handleCancel(bookingId: number) {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn hủy đơn đặt phòng #${bookingId} không?`
    );
    if (!confirm) return;

    try {
      setCancellingId(bookingId);
      await cancelBookingApi(bookingId);
      await loadMyBookings();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Hủy đơn thất bại. Vui lòng thử lại."
      );
    } finally {
      setCancellingId(null);
    }
  }

  const selectedRoomsList = availableRooms.filter((r) =>
    selectedRoomIds.includes(r.roomId)
  );

  return (
    <div className="booking-page">
      <SiteHeader />

      <main className="booking-main">
        <div className="booking-container">
          {/* Top Banner */}
          <section className="booking-hero">
            <div className="badge-pill">
              <CalendarIcon size={16} />
              <span>Hệ thống đăng ký & phân phối phòng học HUIT</span>
            </div>
            <h1>Đăng ký mượn phòng dùng chung</h1>
            <p>
              Chọn ngày, tra cứu phòng trống theo tiết học hoặc khung giờ, nhập
              thông tin hoạt động và gửi yêu cầu phê duyệt nhanh chóng.
            </p>

            {/* Tab switchers */}
            <div className="booking-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
                onClick={() => navigate("/dat-phong")}
              >
                <PlusIcon size={16} />
                <span>Tạo đơn đặt phòng mới</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "my-bookings" ? "active" : ""
                }`}
                onClick={() => navigate("/dat-phong?tab=my-bookings")}
              >
                <ClockIcon size={16} />
                <span>Lịch sử đơn của tôi</span>
              </button>
            </div>
          </section>

          {/* TAB 1: CREATE BOOKING */}
          {activeTab === "create" && (
            <>
              {myEligibility?.hasActiveRestriction && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #f87171",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    marginBottom: "20px",
                    color: "#991b1b",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontWeight: 700,
                      fontSize: "15px",
                      marginBottom: "6px",
                    }}
                  >
                    <BanIcon size={20} />
                    <span>TÀI KHOẢN ĐANG BỊ CẤM MƯỢN PHÒNG</span>
                  </div>
                  <div style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
                    <div>
                      <strong>Lý do áp dụng:</strong>{" "}
                      {myEligibility.reason || "Vi phạm quy định sử dụng phòng thư viện."}
                    </div>
                    {myEligibility.endAt && (
                      <div style={{ marginTop: "4px" }}>
                        <strong>Thời hạn kỷ luật:</strong> Đến hết ngày{" "}
                        {new Date(myEligibility.endAt).toLocaleDateString("vi-VN")}{" "}
                        (còn {myEligibility.remainingDays} ngày).
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: "6px",
                        color: "#b91c1c",
                        fontStyle: "italic",
                        fontSize: "12.5px",
                      }}
                    >
                      * Hệ thống tạm khóa chức năng gửi đơn mượn phòng của bạn trong thời gian này.
                    </div>
                  </div>
                </div>
              )}

              <div className="booking-flow-grid">
                {/* Left Column: Form & Time Selection */}
                <div className="booking-form-col">
                  <form
                    onSubmit={handleBookingSubmit}
                    className="booking-form-card"
                  >
                    <div className="form-step-title">
                      <span className="step-num">1</span>
                      <h3>Chọn thời gian & Chế độ đặt</h3>
                    </div>

                  {/* Mode switcher: Theo tiết vs Theo giờ */}
                  <div className="mode-segmented-control">
                    <button
                      type="button"
                      className={`seg-btn ${
                        form.bookingMode === "period" ? "active" : ""
                      }`}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, bookingMode: "period" }))
                      }
                    >
                      Mượn theo Tiết học (Phòng học, Lab)
                    </button>
                    <button
                      type="button"
                      className={`seg-btn ${
                        form.bookingMode === "time" ? "active" : ""
                      }`}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, bookingMode: "time" }))
                      }
                    >
                      Mượn theo Khung giờ (Hội trường, Phòng họp)
                    </button>
                  </div>

                  {/* Date Picker */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-date">
                      Ngày sử dụng phòng: <span className="req">*</span>
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      className={`form-input ${
                        errors.date ? "input-error" : ""
                      }`}
                      value={form.date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                    {errors.date && (
                      <span className="err-text">{errors.date}</span>
                    )}
                  </div>

                  {/* Period selection */}
                  {form.bookingMode === "period" && (
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="start-period">
                          Tiết bắt đầu: <span className="req">*</span>
                        </label>
                        <select
                          id="start-period"
                          className="form-select"
                          value={form.startPeriodId || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              startPeriodId: Number(e.target.value),
                            }))
                          }
                        >
                          {periods.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.startTime.slice(0, 5)})
                            </option>
                          ))}
                        </select>
                        {errors.startPeriodId && (
                          <span className="err-text">
                            {errors.startPeriodId}
                          </span>
                        )}
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="end-period">
                          Tiết kết thúc: <span className="req">*</span>
                        </label>
                        <select
                          id="end-period"
                          className="form-select"
                          value={form.endPeriodId || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              endPeriodId: Number(e.target.value),
                            }))
                          }
                        >
                          {periods.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.endTime.slice(0, 5)})
                            </option>
                          ))}
                        </select>
                        {errors.endPeriodId && (
                          <span className="err-text">{errors.endPeriodId}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hourly selection */}
                  {form.bookingMode === "time" && (
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="start-time">
                          Giờ bắt đầu: <span className="req">*</span>
                        </label>
                        <input
                          id="start-time"
                          type="time"
                          className="form-input"
                          value={form.startTime}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              startTime: e.target.value,
                            }))
                          }
                        />
                        {errors.startTime && (
                          <span className="err-text">{errors.startTime}</span>
                        )}
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="end-time">
                          Giờ kết thúc: <span className="req">*</span>
                        </label>
                        <input
                          id="end-time"
                          type="time"
                          className="form-input"
                          value={form.endTime}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              endTime: e.target.value,
                            }))
                          }
                        />
                        {errors.endTime && (
                          <span className="err-text">{errors.endTime}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-action-row">
                    <button
                      type="button"
                      className="btn-outline full-width"
                      onClick={searchRooms}
                      disabled={isSearchingRooms}
                    >
                      {isSearchingRooms ? (
                        <span>Đang tìm kiếm phòng trống...</span>
                      ) : (
                        <span>Tìm phòng trống cho khung giờ này</span>
                      )}
                    </button>
                  </div>

                  <hr className="form-divider" />

                  {/* Step 2: Activity Details */}
                  <div className="form-step-title">
                    <span className="step-num">2</span>
                    <h3>Thông tin hoạt động</h3>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="activity-name">
                      Tên hoạt động / Sự kiện: <span className="req">*</span>
                    </label>
                    <input
                      id="activity-name"
                      type="text"
                      className={`form-input ${
                        errors.activityName ? "input-error" : ""
                      }`}
                      placeholder="VD: Học bù môn Lập trình Web, Họp CLB Tin học..."
                      value={form.activityName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          activityName: e.target.value,
                        }))
                      }
                    />
                    {errors.activityName && (
                      <span className="err-text">{errors.activityName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="guest-count">
                      Số lượng người tham gia dự kiến:{" "}
                      <span className="req">*</span>
                    </label>
                    <input
                      id="guest-count"
                      type="number"
                      min={1}
                      className={`form-input ${
                        errors.guestCount ? "input-error" : ""
                      }`}
                      value={form.guestCount}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          guestCount: Number(e.target.value),
                        }))
                      }
                    />
                    {errors.guestCount && (
                      <span className="err-text">{errors.guestCount}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="purpose">
                      Mục đích sử dụng phòng: <span className="req">*</span>
                    </label>
                    <textarea
                      id="purpose"
                      rows={3}
                      className={`form-textarea ${
                        errors.purpose ? "input-error" : ""
                      }`}
                      placeholder="Ghi rõ lý do và nội dung sử dụng phòng..."
                      value={form.purpose}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          purpose: e.target.value,
                        }))
                      }
                    ></textarea>
                    {errors.purpose && (
                      <span className="err-text">{errors.purpose}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="note">
                      Ghi chú / Yêu cầu thiết bị đi kèm:
                    </label>
                    <input
                      id="note"
                      type="text"
                      className="form-input"
                      placeholder="VD: Cần sử dụng máy chiếu và micro không dây..."
                      value={form.note}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, note: e.target.value }))
                      }
                    />
                  </div>

                  {/* Submission alerts */}
                  {submitSuccess && (
                    <div className="alert-success">
                      <span>{submitSuccess}</span>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => navigate("/dat-phong?tab=my-bookings")}
                      >
                        Xem trong danh sách đơn của tôi →
                      </button>
                    </div>
                  )}

                  {submitError && (
                    <div className="alert-error">
                      <InfoIcon size={18} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {errors.rooms && (
                    <div className="alert-error">
                      <InfoIcon size={18} />
                      <span>{errors.rooms}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary-block"
                    disabled={
                      isSubmitting ||
                      selectedRoomIds.length === 0 ||
                      myEligibility?.hasActiveRestriction
                    }
                    style={
                      myEligibility?.hasActiveRestriction
                        ? {
                            background: "#dc2626",
                            borderColor: "#dc2626",
                            cursor: "not-allowed",
                          }
                        : undefined
                    }
                  >
                    {isSubmitting ? (
                      <span>Đang xử lý gửi đơn...</span>
                    ) : myEligibility?.hasActiveRestriction ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <BanIcon size={16} /> Tài khoản đang bị cấm mượn phòng
                      </span>
                    ) : (
                      <span>
                        Gửi yêu cầu đặt {selectedRoomIds.length} phòng đã chọn
                      </span>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column: Available Rooms Selection */}
              <div className="booking-rooms-col">
                <div className="rooms-picker-card">
                  <div className="rooms-picker-header">
                    <div>
                      <h3>Phòng trống khả dụng</h3>
                      <p>
                        Ngày{" "}
                        <strong>{formatVietnameseDate(form.date)}</strong> •{" "}
                        {form.bookingMode === "period"
                          ? `Tiết ${form.startPeriodId} → Tiết ${form.endPeriodId}`
                          : `${form.startTime} — ${form.endTime}`}
                      </p>
                    </div>
                    <span className="rooms-count-pill">
                      {availableRooms.length} phòng khả dụng
                    </span>
                  </div>

                  {isSearchingRooms && (
                    <div className="room-state-box">
                      <div className="spinner"></div>
                      <span>Đang kiểm tra phòng trống...</span>
                    </div>
                  )}

                  {!isSearchingRooms && availableRooms.length === 0 && hasSearched && (
                    <div className="room-empty-card">
                      <InfoIcon size={32} />
                      <h4>Không tìm thấy phòng trống phù hợp</h4>
                      <p>
                        Tất cả các phòng trong khung giờ này đã có lịch đặt hoặc
                        đang bảo trì. Bạn vui lòng chọn ngày hoặc tiết học khác.
                      </p>
                    </div>
                  )}

                  <div className="available-rooms-grid">
                    {availableRooms.map((room) => {
                      const isSelected = selectedRoomIds.includes(room.roomId);
                      return (
                        <div
                          key={room.roomId}
                          className={`room-select-card ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => toggleRoom(room.roomId)}
                        >
                          <div className="room-card-head">
                            <span className="room-code-tag">
                              {room.roomCode}
                            </span>
                            <span className="room-type-tag">
                              {room.roomTypeName}
                            </span>
                          </div>
                          <h4 className="room-card-name">{room.roomName}</h4>
                          <div className="room-card-info">
                            <span>
                              <BuildingIcon size={14} /> Tòa{" "}
                              {room.building || "—"}, Tầng {room.floor || "—"}
                            </span>
                            <span>
                              <UsersIcon size={14} /> Sức chứa: {room.capacity}{" "}
                              chỗ
                            </span>
                          </div>
                          <div className="room-card-bottom">
                            <button
                              type="button"
                              className={`select-btn ${
                                isSelected ? "btn-selected" : "btn-unselected"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRoom(room.roomId);
                              }}
                            >
                              {isSelected ? "✓ Đã chọn" : "+ Chọn phòng này"}
                            </button>
                            <button
                              type="button"
                              className="view-schedule-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/lich-phong?roomId=${room.roomId}&date=${form.date}`
                                );
                              }}
                            >
                              Xem lịch
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary of Selected Rooms */}
                  {selectedRoomsList.length > 0 && (
                    <div className="selected-rooms-summary">
                      <h4>
                        Phòng đã chọn ({selectedRoomsList.length}):
                      </h4>
                      <div className="selected-chips">
                        {selectedRoomsList.map((r) => (
                          <span key={r.roomId} className="room-chip">
                            <strong>{r.roomCode}</strong> — {r.roomName} ({r.capacity} chỗ)
                            <button
                              type="button"
                              onClick={() => toggleRoom(r.roomId)}
                              className="chip-remove-btn"
                              title="Bỏ chọn"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

          {/* TAB 2: MY BOOKINGS HISTORY & ROOM USAGE */}
          {activeTab === "my-bookings" && (
            <section className="my-bookings-section">
              <div className="section-head-bar">
                <div>
                  <h2>Lịch sử đơn & Nhận phòng</h2>
                  <p>Theo dõi tiến độ duyệt, lấy mã nhận phòng và thực hiện Check-in / Trả phòng</p>
                </div>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={loadMyBookings}
                >
                  Tải lại danh sách
                </button>
              </div>

              {/* Usage feedback Toast */}
              {usageToast && (
                <div className={`usage-toast-alert ${usageToast.type}`}>
                  <span>{usageToast.text}</span>
                  <button
                    type="button"
                    className="usage-toast-close"
                    onClick={() => setUsageToast(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Quick Check-in Banner */}
              <div className="user-checkin-hero-box">
                <div className="user-checkin-hero-info">
                  <div className="user-checkin-hero-title">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <ZapIcon size={18} />
                      Nhận phòng nhanh bằng mã xác nhận
                    </span>
                  </div>
                  <p className="user-checkin-hero-desc">
                    Khi đến phòng đã được duyệt, bạn có thể nhập mã nhận phòng (HUIT-xxxxx) hoặc bấm nút Check-in bên dưới để bắt đầu sử dụng phòng ngay.
                  </p>
                </div>
                <form
                  onSubmit={handleQuickCodeCheckIn}
                  className="user-quick-code-form"
                >
                  <input
                    type="text"
                    className="user-quick-code-input"
                    placeholder="Mã: HUIT-xxxxx"
                    value={quickCodeInput}
                    onChange={(e) => setQuickCodeInput(e.target.value)}
                    disabled={isQuickCheckingIn}
                  />
                  <button
                    type="submit"
                    className="user-quick-code-btn"
                    disabled={isQuickCheckingIn}
                  >
                    {isQuickCheckingIn ? (
                      <>
                        <HourglassIcon size={14} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <ZapIcon size={14} />
                        <span>Nhận phòng ngay</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {isLoadingBookings && (
                <div className="loading-box">
                  <div className="spinner"></div>
                  <span>Đang tải lịch sử đơn đặt & phiên sử dụng...</span>
                </div>
              )}

              {!isLoadingBookings && myBookings.length === 0 && (
                <div className="table-empty-box">
                  <CalendarIcon size={36} className="empty-icon" />
                  <h4>Bạn chưa có đơn đặt phòng nào</h4>
                  <p>
                    Hãy tạo đơn đặt phòng đầu tiên để phục vụ nhu cầu học tập,
                    nghiên cứu hoặc sinh hoạt tại trường.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => navigate("/dat-phong")}
                  >
                    <PlusIcon size={18} />
                    <span>Đặt phòng ngay</span>
                  </button>
                </div>
              )}

              {!isLoadingBookings && myBookings.length > 0 && (
                <div className="bookings-list">
                  {myBookings.map((b) => {
                    const statusObj = getScheduleStatusBadge(b.status);
                    const isCancellable = canCancelBooking(b.status);

                    return (
                      <div key={b.id} className="booking-card-item">
                        <div className="booking-card-header">
                          <div className="booking-id-tag">
                            <strong>Đơn đặt #{b.id}</strong>
                            <span className="booking-date-sub">
                              Ngày tạo:{" "}
                              {new Date(b.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                          </div>
                          <div className="booking-status-wrap">
                            <span
                              className={`badge-status ${statusObj.cssClass}`}
                            >
                              {statusObj.label}
                            </span>
                            {isCancellable && (
                              <button
                                type="button"
                                className="btn-cancel-booking"
                                disabled={cancellingId === b.id}
                                onClick={() => handleCancel(b.id)}
                              >
                                {cancellingId === b.id
                                  ? "Đang hủy..."
                                  : "Hủy đơn này"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="booking-card-body">
                          <h3 className="booking-act-name">{b.activityName}</h3>
                          <p className="booking-purpose">
                            <strong>Mục đích:</strong> {b.purpose}
                          </p>
                          {b.note && (
                            <p className="booking-note">
                              <strong>Ghi chú:</strong> {b.note}
                            </p>
                          )}
                          {b.rejectionReason && (
                            <div className="booking-rejection">
                              <strong>Lý do từ chối:</strong> {b.rejectionReason}
                            </div>
                          )}

                          {/* Room Details in Booking */}
                          <div className="booking-details-sublist">
                            <h4>Danh sách phòng & Trạng thái nhận phòng ({b.details.length}):</h4>
                            <div className="user-details-grid">
                              {b.details.map((detail) => {
                                const session = sessionByDetailId.get(detail.id);
                                const detailStatus = getScheduleStatusBadge(detail.status);
                                const isInUse =
                                  detail.status === "Đang sử dụng" ||
                                  session?.status === "Đang sử dụng";
                                const isCompleted =
                                  detail.status === "Hoàn thành" ||
                                  detail.status === "Hoàn tất" ||
                                  session?.status === "Hoàn thành" ||
                                  session?.status === "Hoàn tất";
                                const isApproved =
                                  !isInUse &&
                                  !isCompleted &&
                                  (detail.status === "Đã duyệt" ||
                                    session?.status === "Chờ nhận phòng");

                                const cardStatusClass = isApproved
                                  ? "status-approved"
                                  : isInUse
                                  ? "status-in-use"
                                  : "";

                                return (
                                  <div
                                    key={detail.id}
                                    className={`user-detail-card ${cardStatusClass}`}
                                  >
                                    <div className="user-detail-head">
                                      <div className="user-room-title">
                                        <span className="user-room-code-badge">
                                          {detail.roomCode}
                                        </span>
                                        <span>{detail.roomName}</span>
                                      </div>
                                      {isInUse ? (
                                        <span className="badge-in-use-pill">
                                          <span className="pulse-dot-green"></span>
                                          Đang sử dụng
                                        </span>
                                      ) : (
                                        <span
                                          className={`detail-chip ${detailStatus.cssClass}`}
                                        >
                                          {detailStatus.label}
                                        </span>
                                      )}
                                    </div>

                                    <div className="user-detail-meta">
                                      <div className="user-detail-meta-row">
                                        <ClockIcon size={13} />
                                        <span>
                                          {new Date(detail.startAt).toLocaleDateString("vi-VN")} • {formatDetailTimeRange(detail)}
                                        </span>
                                      </div>

                                      {/* Confirmation Code for check-in */}
                                      {session?.confirmationCode && (
                                        <div className="user-code-box">
                                          <span>Mã nhận phòng:</span>
                                          <strong className="user-code-val">
                                            {session.confirmationCode}
                                          </strong>
                                          <button
                                            type="button"
                                            className="btn-copy-code-mini"
                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                session.confirmationCode
                                              );
                                              alert(
                                                `Đã sao chép mã nhận phòng: ${session.confirmationCode}`
                                              );
                                            }}
                                          >
                                            <CopyIcon size={12} />
                                            <span>Chép mã</span>
                                          </button>
                                        </div>
                                      )}

                                      {/* Timestamps */}
                                      {session?.actualCheckIn && (
                                        <div className="completed-note-text">
                                          Đã nhận phòng lúc:{" "}
                                          {new Date(session.actualCheckIn).toLocaleTimeString(
                                            "vi-VN",
                                            { hour: "2-digit", minute: "2-digit" }
                                          )}
                                        </div>
                                      )}
                                      {session?.actualCheckOut && (
                                        <div className="completed-note-text">
                                          Đã trả phòng lúc:{" "}
                                          {new Date(session.actualCheckOut).toLocaleTimeString(
                                            "vi-VN",
                                            { hour: "2-digit", minute: "2-digit" }
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="user-detail-footer">
                                      {isApproved && (
                                        <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                                          <button
                                            type="button"
                                            className="btn-user-checkin-action"
                                            disabled={directCheckingInId === detail.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDirectCheckIn(detail, session);
                                            }}
                                          >
                                            {directCheckingInId === detail.id ? (
                                              <>
                                                <HourglassIcon size={14} />
                                                <span>Đang nhận phòng...</span>
                                              </>
                                            ) : (
                                              <>
                                                <ZapIcon size={14} />
                                                <span>Check-in nhận phòng ngay</span>
                                              </>
                                            )}
                                          </button>
                                          <button
                                            type="button"
                                            className="btn-outline"
                                            style={{ padding: "6px 10px", fontSize: "12px", whiteSpace: "nowrap" }}
                                            title="Tùy chỉnh số lượng người hoặc ghi chú nhận phòng"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCheckInModal(detail, b, session);
                                            }}
                                          >
                                            Chi tiết
                                          </button>
                                        </div>
                                      )}

                                      {isInUse && (
                                        <button
                                          type="button"
                                          className="btn-user-checkout-action"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCheckOutModal(detail, b, session);
                                          }}
                                        >
                                          <CheckIcon size={14} />
                                          <span>Xác nhận trả phòng</span>
                                        </button>
                                      )}

                                      {isCompleted && (
                                        <span className="completed-note-text" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                          <CheckIcon size={12} />
                                          <span>Đã hoàn tất buổi mượn phòng</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* USER CHECK-IN MODAL */}
          {isCheckInModalOpen && selectedDetailItem && (
            <div
              className="admin-modal-overlay modal-backdrop"
              onClick={() => setIsCheckInModalOpen(false)}
            >
              <div
                className="admin-modal-box modal-dialog quick-checkin-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="modal-title-wrap">
                    <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <ZapIcon size={18} />
                      Xác nhận nhận phòng
                    </h3>
                    <span className="modal-subtitle">
                      Bắt đầu thời gian sử dụng phòng thực tế
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setIsCheckInModalOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="user-modal-summary">
                    <div className="user-modal-summary-row">
                      <span>Phòng:</span>
                      <strong>
                        {selectedDetailItem.detail.roomCode} — {selectedDetailItem.detail.roomName}
                      </strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Hoạt động:</span>
                      <strong>{selectedDetailItem.booking.activityName}</strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Thời gian:</span>
                      <strong>{formatDetailTimeRange(selectedDetailItem.detail)}</strong>
                    </div>
                    {selectedDetailItem.session?.confirmationCode && (
                      <div className="user-modal-summary-row">
                        <span>Mã nhận phòng:</span>
                        <strong className="text-primary">
                          {selectedDetailItem.session.confirmationCode}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: "14px" }}>
                    <label className="form-label">
                      Số lượng người thực tế vào phòng:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      className="form-input"
                      value={checkInGuestCount}
                      onChange={(e) =>
                        setCheckInGuestCount(Math.max(1, Number(e.target.value)))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Ghi chú khi nhận phòng (tùy chọn):
                    </label>
                    <textarea
                      rows={2}
                      className="form-input"
                      placeholder="Ghi chú thêm về thiết bị hoặc hiện trạng ban đầu..."
                      value={checkInNote}
                      onChange={(e) => setCheckInNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setIsCheckInModalOpen(false)}
                    disabled={isProcessingCheckIn}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmCheckIn}
                    disabled={isProcessingCheckIn}
                  >
                    {isProcessingCheckIn ? (
                      <>
                        <HourglassIcon size={14} />
                        <span>Đang nhận phòng...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon size={14} />
                        <span>Xác nhận vào phòng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* USER CHECK-OUT MODAL */}
          {isCheckOutModalOpen && selectedDetailItem && (
            <div
              className="admin-modal-overlay modal-backdrop"
              onClick={() => setIsCheckOutModalOpen(false)}
            >
              <div
                className="admin-modal-box modal-dialog quick-checkin-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="modal-title-wrap">
                    <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <CheckIcon size={18} />
                      Xác nhận trả phòng
                    </h3>
                    <span className="modal-subtitle">
                      Hoàn thành phiên sử dụng và bàn giao phòng
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setIsCheckOutModalOpen(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="user-modal-summary">
                    <div className="user-modal-summary-row">
                      <span>Phòng:</span>
                      <strong>
                        {selectedDetailItem.detail.roomCode} — {selectedDetailItem.detail.roomName}
                      </strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Hoạt động:</span>
                      <strong>{selectedDetailItem.booking.activityName}</strong>
                    </div>
                  </div>

                  <p className="quick-checkin-hint">
                    Vui lòng kiểm tra và tích xác nhận các tiêu chí bàn giao phòng trước khi rời đi:
                  </p>

                  <div className="user-checkout-checklist">
                    <label className="checkout-check-item">
                      <input
                        type="checkbox"
                        checked={lightsOff}
                        onChange={(e) => setLightsOff(e.target.checked)}
                      />
                      <span>Đã tắt điều hòa nhiệt độ, quạt gió và hệ thống đèn chiếu sáng</span>
                    </label>

                    <label className="checkout-check-item">
                      <input
                        type="checkbox"
                        checked={cleaned}
                        onChange={(e) => setCleaned(e.target.checked)}
                      />
                      <span>Đã thu dọn rác cá nhân và trả lại phòng sạch sẽ gọn gàng</span>
                    </label>

                    <label className="checkout-check-item">
                      <input
                        type="checkbox"
                        checked={devicesOk}
                        onChange={(e) => setDevicesOk(e.target.checked)}
                      />
                      <span>Tất cả thiết bị, máy chiếu, bàn ghế nguyên vẹn (bỏ tích nếu có hư hỏng)</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Ghi chú phản hồi / Báo cáo sự cố (nếu có):
                    </label>
                    <textarea
                      rows={2}
                      className="form-input"
                      placeholder="Nếu có sự cố máy chiếu, điều hòa... xin hãy ghi chú để ban quản lý sửa chữa kịp thời..."
                      value={checkOutNote}
                      onChange={(e) => setCheckOutNote(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setIsCheckOutModalOpen(false)}
                    disabled={isProcessingCheckOut}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                    onClick={handleConfirmCheckOut}
                    disabled={isProcessingCheckOut}
                  >
                    {isProcessingCheckOut ? (
                      <>
                        <HourglassIcon size={14} />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon size={14} />
                        <span>Xác nhận trả phòng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <InfoFooter />
    </div>
  );
}
