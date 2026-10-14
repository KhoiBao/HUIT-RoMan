import { useState, useEffect } from "react";
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
} from "../components/Icon";
import {
  type AvailableRoom,
  type BookingResponse,
  type BookingFormState,
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

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active Tab: "create" | "my-bookings"
  const [activeTab, setActiveTab] = useState<"create" | "my-bookings">("create");

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

  // My bookings tab state
  const [myBookings, setMyBookings] = useState<BookingResponse[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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

  // 3. Load My Bookings
  async function loadMyBookings() {
    setIsLoadingBookings(true);
    try {
      const list = await fetchMyBookingsApi();
      setMyBookings(list);
    } catch (err: unknown) {
      console.error("Failed to fetch my bookings", err);
    } finally {
      setIsLoadingBookings(false);
    }
  }

  useEffect(() => {
    if (activeTab === "my-bookings") {
      loadMyBookings();
    }
  }, [activeTab]);

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
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Gửi đơn đặt phòng thất bại. Vui lòng kiểm tra lại thông tin."
      );
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
                onClick={() => setActiveTab("create")}
              >
                <PlusIcon size={16} />
                <span>Tạo đơn đặt phòng mới</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${
                  activeTab === "my-bookings" ? "active" : ""
                }`}
                onClick={() => setActiveTab("my-bookings")}
              >
                <ClockIcon size={16} />
                <span>Lịch sử đơn của tôi</span>
              </button>
            </div>
          </section>

          {/* TAB 1: CREATE BOOKING */}
          {activeTab === "create" && (
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
                        onClick={() => setActiveTab("my-bookings")}
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
                    disabled={isSubmitting || selectedRoomIds.length === 0}
                  >
                    {isSubmitting ? (
                      <span>Đang xử lý gửi đơn...</span>
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
          )}

          {/* TAB 2: MY BOOKINGS HISTORY */}
          {activeTab === "my-bookings" && (
            <section className="my-bookings-section">
              <div className="section-head-bar">
                <div>
                  <h2>Lịch sử các đơn đặt phòng của bạn</h2>
                  <p>Theo dõi tiến độ xét duyệt và trạng thái từng phòng</p>
                </div>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={loadMyBookings}
                >
                  Tải lại danh sách
                </button>
              </div>

              {isLoadingBookings && (
                <div className="loading-box">
                  <div className="spinner"></div>
                  <span>Đang tải lịch sử đơn đặt...</span>
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
                    onClick={() => setActiveTab("create")}
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
                            <h4>Danh sách phòng trong đơn ({b.details.length}):</h4>
                            <div className="booking-details-grid">
                              {b.details.map((detail) => {
                                const detailStatus = getScheduleStatusBadge(
                                  detail.status
                                );
                                return (
                                  <div
                                    key={detail.id}
                                    className="detail-room-badge"
                                  >
                                    <div className="detail-room-title">
                                      <BuildingIcon size={14} />
                                      <strong>{detail.roomCode}</strong> —{" "}
                                      {detail.roomName}
                                    </div>
                                    <div className="detail-time-text">
                                      {new Date(detail.startAt).toLocaleDateString("vi-VN")} • {formatDetailTimeRange(detail)}
                                    </div>
                                    <span
                                      className={`detail-chip ${detailStatus.cssClass}`}
                                    >
                                      {detailStatus.label}
                                    </span>
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
        </div>
      </main>

      <InfoFooter />
    </div>
  );
}
