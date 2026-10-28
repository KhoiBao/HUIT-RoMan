import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  UsersIcon,
  PlusIcon,
  InfoIcon,
  BanIcon,
  ZapIcon,
  CheckIcon,
  CopyIcon,
  HourglassIcon,
  RefreshCwIcon,
  StarIcon,
  HistoryIcon,
} from "../components/Icon";
import { FeedbackModal } from "../components/FeedbackModal";
import { ApprovalHistoryModal } from "../components/ApprovalHistoryModal";
import { useAuth } from "../auth/AuthContext";
import { checkMyEligibility, type UserEligibility } from "../lib/violations";
import {
  type AvailableRoom,
  type AvailableRoomGroup,
  type AvailableRoomScope,
  type BookingResponse,
  type BookingFormState,
  type BookingDetailItem,
  validateBookingForm,
  validateStudentBookingWindow,
  getNextStudentBookingSlot,
  groupAvailableRoomsByType,
  groupAvailableRoomsByBuilding,
  filterAvailableRoomsByScope,
  summarizeRoomLocations,
  isStudentBookableRoomType,
  isStudentRole,
  isLecturerRole,
  groupPeriodsByRoomType,
  STUDENT_OPEN_TIME,
  STUDENT_CLOSE_TIME,
  buildBookingPayload,
  formatDetailTimeRange,
  fetchAvailableRoomsApi,
  createBookingApi,
  fetchMyBookingsApi,
  cancelBookingApi,
  checkInBookingApi,
  evaluateCheckInWindow,
  getServerClockOffsetMs,
  canCancelBookingOnline,
  isApprovedBookingStatus,
  getBookingStartAt,
  getCancelReasonLabel,
  describeCancelSource,
  describeCancelReason,
  CANCEL_REASON_OPTIONS,
  validateCancelReasonSelection,
  parseDdMmYyyy,
  formatDdMmYyyy,
  getBookingDatePresetRange,
  isIsoDateInRange,
  type BookingDateRange,
  type BookingDatePreset,
} from "../lib/booking";
import {
  type Period,
  toISODateString,
  toVietnamDateKey,
  formatVietnameseDate,
  getScheduleStatusBadge,
  fetchPeriodsApi,
  formatPeriodLabel,
} from "../lib/schedule";
import {
  fetchMyUsageSessions,
  checkInSession,
  checkOutSession,
  type UsageSessionItem,
} from "../lib/usage";
import { useConfirm } from "../context/ConfirmContext";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isStudent = isStudentRole(user?.role);
  const isLecturer = isLecturerRole(user?.role);

  // Active Tab: "create" | "my-bookings" (auto-select from ?tab=my-bookings)
  const activeTab: "create" | "my-bookings" =
    searchParams.get("tab") === "my-bookings" ? "my-bookings" : "create";

  // Periods metadata
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Form State
  const studentSlot = getNextStudentBookingSlot();
  const defaultDate =
    searchParams.get("date") ||
    (isStudent ? studentSlot.date : toISODateString(new Date()));
  const initialRoomId = Number(searchParams.get("roomId")) || null;
  const initialStartPeriod = Number(searchParams.get("startPeriodId")) || 1;
  const initialEndPeriod = Number(searchParams.get("endPeriodId")) || 2;
  const initialStartTime = isStudent
    ? studentSlot.startTime
    : searchParams.get("startTime") || "08:00";
  const initialEndTime = isStudent
    ? studentSlot.endTime
    : searchParams.get("endTime") || "10:30";

  const [form, setForm] = useState<BookingFormState>({
    activityName: "",
    purpose: "",
    guestCount: isStudent ? 5 : 30,
    note: "",
    date: defaultDate,
    bookingMode: isStudent
      ? "time"
      : searchParams.get("startTime")
        ? "time"
        : "period",
    startPeriodId: initialStartPeriod,
    endPeriodId: initialEndPeriod,
    startTime: initialStartTime,
    endTime: initialEndTime,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mỗi loại phòng (lý thuyết / thực hành) có bộ 16 tiết riêng; chỉ hiển thị
  // các tiết thuộc bộ lịch đang chọn để tránh trộn lịch.
  const periodGroups = useMemo(() => groupPeriodsByRoomType(periods), [periods]);
  const [periodRoomTypeId, setPeriodRoomTypeId] = useState<number | null>(null);
  const activePeriodGroup = useMemo(() => {
    const explicit = periodGroups.find(
      (group) => group.roomTypeId === periodRoomTypeId
    );
    if (explicit) return explicit;
    const matching = periodGroups.find((group) =>
      group.periods.some((period) => period.id === form.startPeriodId)
    );
    return matching ?? periodGroups[0] ?? null;
  }, [periodGroups, periodRoomTypeId, form.startPeriodId]);
  const activePeriods = activePeriodGroup?.periods ?? periods;

  useEffect(() => {
    if (
      form.bookingMode !== "period" ||
      !activePeriodGroup ||
      activePeriodGroup.periods.length === 0
    ) {
      return;
    }
    const ids = new Set(activePeriodGroup.periods.map((period) => period.id));
    if (
      !ids.has(form.startPeriodId ?? -1) ||
      !ids.has(form.endPeriodId ?? -1)
    ) {
      const first = activePeriodGroup.periods[0];
      const second = activePeriodGroup.periods[1] ?? first;
      setForm((prev) => ({
        ...prev,
        startPeriodId: first.id,
        endPeriodId: second.id,
      }));
    }
  }, [
    activePeriodGroup,
    form.bookingMode,
    form.startPeriodId,
    form.endPeriodId,
  ]);

  function handlePeriodScheduleChange(value: string) {
    const roomTypeId = Number(value);
    const group = periodGroups.find((item) => item.roomTypeId === roomTypeId);
    if (!group || group.periods.length === 0) return;

    const first = group.periods[0];
    const second = group.periods[1] ?? first;
    setPeriodRoomTypeId(roomTypeId);
    setForm((prev) => ({
      ...prev,
      startPeriodId: first.id,
      endPeriodId: second.id,
    }));
    setAvailableRooms([]);
    setSelectedRoomIds([]);
    setHasSearched(false);
    setSubmitError(null);
    if (!isInitializing) {
      void searchRooms({ startPeriodId: first.id, endPeriodId: second.id });
    }
  }

  const selectedStartPeriod = activePeriods.find(
    (period) => period.id === form.startPeriodId
  );
  const selectedEndPeriod = activePeriods.find(
    (period) => period.id === form.endPeriodId
  );

  // Room search & selection
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>(
    initialRoomId ? [initialRoomId] : []
  );
  const [isSearchingRooms, setIsSearchingRooms] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState<number[]>([]);
  const [timeRoomScope, setTimeRoomScope] = useState<AvailableRoomScope>(
    isStudent ? "library" : "hall"
  );
  const [activeRoomBuilding, setActiveRoomBuilding] = useState<
    Record<number, string>
  >({});
  const [activeRoomFloor, setActiveRoomFloor] = useState<Record<number, string>>(
    {}
  );

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [myEligibility, setMyEligibility] = useState<UserEligibility | null>(null);

  // My bookings & Usage Sessions tab state
  const [myBookings, setMyBookings] = useState<BookingResponse[]>([]);
  const [myUsageSessions, setMyUsageSessions] = useState<UsageSessionItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [checkingInBookingId, setCheckingInBookingId] = useState<number | null>(null);

  // Đồng hồ đếm ngược nhận phòng (chỉ phục vụ hiển thị — backend tự hủy no-show)
  const [nowTick, setNowTick] = useState<Date>(() => new Date());
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number>(0);
  const expiredSeenRef = useRef<Set<number>>(new Set<number>());

  // Form hủy đặt phòng 2 bước: chọn lý do → xác nhận cuối (API chỉ gọi sau xác nhận cuối)
  const [cancelFormBooking, setCancelFormBooking] = useState<BookingResponse | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState<string>("");
  const [cancelReasonDetail, setCancelReasonDetail] = useState<string>("");
  const [cancelFormError, setCancelFormError] = useState<string | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

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
  // List View states (search, status filter & detail modal)
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");
  const [historyDateFilter, setHistoryDateFilter] = useState<
    "all" | BookingDatePreset | "custom"
  >("all");
  const [historyCustomRange, setHistoryCustomRange] =
    useState<BookingDateRange | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState<string>("");
  const [customDateTo, setCustomDateTo] = useState<string>("");
  const [dateFilterError, setDateFilterError] = useState<string>("");
  const [viewingDetailItem, setViewingDetailItem] = useState<{
    booking: BookingResponse;
    detail: BookingDetailItem;
    session?: UsageSessionItem;
    isApproved: boolean;
    isInUse: boolean;
    isCompleted: boolean;
    isCancelled: boolean;
    isPending: boolean;
    canCancel: boolean;
    isCancelExpired: boolean;
    statusBadge: { label: string; cssClass: string };
  } | null>(null);
  const [usageToast, setUsageToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackBookingId, setFeedbackBookingId] = useState<number | undefined>();
  const [feedbackRoomName, setFeedbackRoomName] = useState<string | undefined>();

  const openFeedbackModal = (bookingId: number, roomName?: string) => {
    setFeedbackBookingId(bookingId);
    setFeedbackRoomName(roomName);
    setFeedbackModalOpen(true);
  };

  // Approval history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyBookingId, setHistoryBookingId] = useState<number | undefined>();
  const [historyActivityName, setHistoryActivityName] = useState<string | undefined>();

  const openApprovalHistoryModal = (bookingId: number, activityName?: string) => {
    setHistoryBookingId(bookingId);
    setHistoryActivityName(activityName);
    setHistoryModalOpen(true);
  };


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
  async function searchRooms(overrides?: Partial<BookingFormState>) {
    const searchForm = overrides ? { ...form, ...overrides } : form;
    setSubmitError(null);

    // Chuẩn hóa khung tiết trước khi gọi API: bỏ tiết đã qua và không cho
    // tiết kết thúc đứng trước tiết bắt đầu.
    let periodStartId = searchForm.startPeriodId;
    let periodEndId = searchForm.endPeriodId;
    if (searchForm.bookingMode === "period") {
      const resolved = resolvePeriodSelection(searchForm);
      if (resolved.error || resolved.startId == null || resolved.endId == null) {
        setSubmitError(
          resolved.error ?? "Khung giờ đặt phòng không hợp lệ."
        );
        return;
      }
      periodStartId = resolved.startId;
      periodEndId = resolved.endId;
      if (
        resolved.startId !== form.startPeriodId ||
        resolved.endId !== form.endPeriodId
      ) {
        setForm((prev) => ({
          ...prev,
          startPeriodId: resolved.startId as number,
          endPeriodId: resolved.endId as number,
        }));
      }
    }

    if (isStudent) {
      const windowValidation = validateStudentBookingWindow(searchForm);
      if (!windowValidation.isValid) {
        setErrors((prev) => ({ ...prev, ...windowValidation.errors }));
        return;
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.date;
      delete next.startTime;
      delete next.endTime;
      delete next.startPeriodId;
      delete next.endPeriodId;
      delete next.bookingMode;
      return next;
    });

    setIsSearchingRooms(true);
    try {
      const results = await fetchAvailableRoomsApi({
        date: searchForm.date,
        startPeriodId:
          searchForm.bookingMode === "period" ? periodStartId : undefined,
        endPeriodId:
          searchForm.bookingMode === "period" ? periodEndId : undefined,
        startTime:
          searchForm.bookingMode === "time" ? `${searchForm.startTime}:00` : undefined,
        endTime:
          searchForm.bookingMode === "time" ? `${searchForm.endTime}:00` : undefined,
      });

      // Sinh viên chỉ thấy phòng học nhóm và phòng thuyết trình của Thư viện.
      const visibleResults = isStudent
        ? results.filter((room) => isStudentBookableRoomType(room.roomTypeName))
        : results;

      setAvailableRooms(visibleResults);
      setHasSearched(true);

      // Keep only selected rooms that are still available
      setSelectedRoomIds((prev) =>
        prev.filter((id) => visibleResults.some((r) => r.roomId === id))
      );
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Lỗi khi tìm phòng trống."
      );
    } finally {
      setIsSearchingRooms(false);
    }
  }

  // Đổi chế độ đặt → xóa kết quả cũ và tìm lại theo chế độ mới.
  function handleBookingModeChange(mode: "period" | "time") {
    if (form.bookingMode === mode) return;
    setForm((prev) => ({ ...prev, bookingMode: mode }));
    setAvailableRooms([]);
    setSelectedRoomIds([]);
    setHasSearched(false);
    setSubmitError(null);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.bookingMode;
      return next;
    });
    if (!isInitializing) {
      void searchRooms({ bookingMode: mode });
    }
  }

  function handleTimeScopeChange(scope: AvailableRoomScope) {
    if (scope === timeRoomScope) return;
    setTimeRoomScope(scope);
    if (availableRooms.length === 0) return;
    const visibleIds = new Set(
      filterAvailableRoomsByScope(availableRooms, scope).map((room) => room.roomId)
    );
    setSelectedRoomIds((prev) => prev.filter((id) => visibleIds.has(id)));
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
      setServerClockOffsetMs(getServerClockOffsetMs(bookingsList.map((b) => b.checkInWindow)));
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

  function handleDateFilterChange(next: "all" | BookingDatePreset) {
    setHistoryDateFilter(next);
    setHistoryCustomRange(null);
    setCustomDateFrom("");
    setCustomDateTo("");
    setDateFilterError("");
  }

  function handleApplyCustomDateRange() {
    const from = parseDdMmYyyy(customDateFrom);
    const to = parseDdMmYyyy(customDateTo);
    if (!from || !to) {
      setDateFilterError("Nhập đủ ngày theo định dạng dd/mm/yyyy.");
      return;
    }
    if (from > to) {
      setDateFilterError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }
    setDateFilterError("");
    setHistoryCustomRange({ from, to });
    setHistoryDateFilter("custom");
  }

  // Thời gian "hiện tại" bám sát server (offset lấy từ checkInWindow.serverTime)
  const nowWithOffset = useMemo(
    () => new Date(nowTick.getTime() + serverClockOffsetMs),
    [nowTick, serverClockOffsetMs]
  );
  const todayKey = toVietnamDateKey(nowWithOffset.toISOString());

  // Cho phép chọn lại toàn bộ tiết của bộ lịch đang dùng; ràng buộc duy nhất là
  // tiết kết thúc không được đứng trước tiết bắt đầu.
  const selectableStartPeriods = activePeriods;
  const selectedStartIndex = activePeriods.findIndex(
    (p) => p.id === form.startPeriodId
  );
  const selectableEndPeriods =
    selectedStartIndex >= 0
      ? activePeriods.slice(selectedStartIndex)
      : activePeriods;

  const resolvePeriodSelection = useCallback(
    (formLike: BookingFormState) => {
      if (formLike.bookingMode !== "period" || activePeriods.length === 0) {
        return {
          startId: formLike.startPeriodId,
          endId: formLike.endPeriodId,
          error: null as string | null,
        };
      }
      const startId = activePeriods.some(
        (p) => p.id === formLike.startPeriodId
      )
        ? formLike.startPeriodId
        : activePeriods[0].id;
      const startIdx = activePeriods.findIndex((p) => p.id === startId);
      const endIdx = activePeriods.findIndex(
        (p) => p.id === formLike.endPeriodId
      );
      const endId =
        endIdx >= startIdx
          ? formLike.endPeriodId
          : (activePeriods[startIdx + 1]?.id ?? startId);
      return { startId, endId, error: null as string | null };
    },
    [activePeriods]
  );

  // Đưa lựa chọn tiết về mặc định: hai tiết đầu tiên của bộ lịch đang dùng.
  function handleResetPeriods() {
    const first = activePeriods[0];
    if (!first) return;
    setForm((prev) => ({
      ...prev,
      startPeriodId: first.id,
      endPeriodId: activePeriods[1]?.id ?? first.id,
    }));
  }

  // Tự sửa lựa chọn khi đổi ngày hoặc thời gian vượt qua tiết đang chọn.
  useEffect(() => {
    if (form.bookingMode !== "period" || activePeriods.length === 0) return;
    const resolved = resolvePeriodSelection(form);
    if (resolved.error || resolved.startId == null || resolved.endId == null) {
      return;
    }
    if (
      resolved.startId !== form.startPeriodId ||
      resolved.endId !== form.endPeriodId
    ) {
      setForm((prev) => ({
        ...prev,
        startPeriodId: resolved.startId as number,
        endPeriodId: resolved.endId as number,
      }));
    }
  }, [form, activePeriods, resolvePeriodSelection]);

  // Bộ đếm ngược hiển thị — chỉ là UI; việc tự động hủy do backend đảm nhiệm.
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Khi một đơn vừa bước qua hạn nhận phòng → tải lại danh sách để phản ánh
  // trạng thái do backend (tác vụ nền) xử lý.
  useEffect(() => {
    if (isLoadingBookings) return;
    const currentExpired = new Set<number>();
    for (const b of myBookings) {
      if (!isApprovedBookingStatus(b.status) || b.checkedInAt || !b.checkInWindow?.startAt) continue;
      const info = evaluateCheckInWindow(b.checkInWindow.startAt, nowWithOffset);
      if (info.state === "expired") currentExpired.add(b.id);
    }
    const hasNewlyExpired = Array.from(currentExpired).some((id) => !expiredSeenRef.current.has(id));
    expiredSeenRef.current = currentExpired;
    if (hasNewlyExpired) {
      loadMyBookings();
    }
  }, [nowTick, nowWithOffset, myBookings, isLoadingBookings]);

  // Session map by BookingDetailId for fast O(1) lookup
  const sessionByDetailId = useMemo(() => {
    const map = new Map<number, UsageSessionItem>();
    for (const s of myUsageSessions) {
      map.set(s.bookingDetailId, s);
    }
    return map;
  }, [myUsageSessions]);

  // Flattened booking items for List View
  const flatBookingItems = useMemo(() => {
    const items: {
      booking: BookingResponse;
      detail: BookingDetailItem;
      session?: UsageSessionItem;
      isApproved: boolean;
      isInUse: boolean;
      isCompleted: boolean;
      isCancelled: boolean;
      isPending: boolean;
      canCancel: boolean;
      isCancelExpired: boolean;
      statusBadge: { label: string; cssClass: string };
    }[] = [];

    for (const b of myBookings) {
      if (b.details && b.details.length > 0) {
        for (const d of b.details) {
          const session = sessionByDetailId.get(d.id);
          const isInUse =
            d.status === "Đang sử dụng" ||
            b.status === "Đang sử dụng" ||
            session?.status === "Đang sử dụng";
          const isCompleted =
            d.status === "Hoàn thành" ||
            d.status === "Hoàn tất" ||
            session?.status === "Hoàn thành" ||
            session?.status === "Hoàn tất";
          const isCancelled =
            d.status === "Đã hủy" ||
            b.status === "Đã hủy" ||
            session?.status === "Đã hủy";
          const isPending =
            !isInUse &&
            !isCompleted &&
            !isCancelled &&
            (d.status === "Chờ duyệt" || b.status === "Chờ duyệt");

          // Trạng thái 'Đã duyệt' và người dùng chưa Check-in
          const hasCheckedIn = Boolean(
            b.checkedInAt ||
            session?.actualCheckIn ||
            isInUse ||
            isCompleted
          );
          const isApproved =
            !hasCheckedIn &&
            !isCancelled &&
            !isPending &&
            (d.status === "Đã duyệt" ||
              b.status === "Đã duyệt" ||
              session?.status === "Chờ nhận phòng");

          const canCancel = isApproved && canCancelBookingOnline(b, nowWithOffset).allowed;
          const isCancelExpired = isApproved && !canCancel;

          const effectiveStatus = isInUse
            ? "Đang sử dụng"
            : isApproved
            ? "Đã duyệt"
            : isCompleted
            ? "Hoàn thành"
            : isCancelled
            ? "Đã hủy"
            : d.status || b.status;

          const statusBadge = getScheduleStatusBadge(effectiveStatus);

          items.push({
            booking: b,
            detail: d,
            session,
            isApproved,
            isInUse,
            isCompleted,
            isCancelled,
            isPending,
            canCancel,
            isCancelExpired,
            statusBadge,
          });
        }
      } else {
        const isCancelled = b.status === "Đã hủy";
        const isCompleted = b.status === "Hoàn thành" || b.status === "Hoàn tất";
        const isInUse = b.status === "Đang sử dụng";
        const hasCheckedIn = Boolean(b.checkedInAt || isInUse || isCompleted);
        const isApproved = !hasCheckedIn && !isCancelled && b.status === "Đã duyệt";
        const isPending = b.status === "Chờ duyệt";
        const canCancel = isApproved && canCancelBookingOnline(b, nowWithOffset).allowed;
        const isCancelExpired = isApproved && !canCancel;
        const statusBadge = getScheduleStatusBadge(b.status);

        items.push({
          booking: b,
          detail: {
            id: b.id,
            roomId: 0,
            roomName: "Chưa phân phòng",
            roomCode: "—",
            startAt: b.requestedAt || b.createdAt,
            endAt: b.requestedAt || b.createdAt,
            guestCount: b.guestCount,
            status: b.status,
            createdAt: b.createdAt,
          },
          session: undefined,
          isApproved,
          isInUse,
          isCompleted,
          isCancelled,
          isPending,
          canCancel,
          isCancelExpired,
          statusBadge,
        });
      }
    }

    return items.sort((a, b) => {
      const tA = new Date(a.detail.startAt || a.booking.createdAt).getTime();
      const tB = new Date(b.detail.startAt || b.booking.createdAt).getTime();
      return tB - tA;
    });
  }, [myBookings, sessionByDetailId, nowWithOffset]);

  // Lọc theo ngày mượn (ngày bắt đầu của từng chi tiết đơn).
  const historyDateRange = useMemo<BookingDateRange | null>(() => {
    if (historyDateFilter === "custom") return historyCustomRange;
    if (historyDateFilter === "all") return null;
    return getBookingDatePresetRange(historyDateFilter, todayKey);
  }, [historyDateFilter, historyCustomRange, todayKey]);

  const dateFilteredBookingItems = useMemo(() => {
    if (!historyDateRange) return flatBookingItems;
    return flatBookingItems.filter((item) =>
      isIsoDateInRange(toVietnamDateKey(item.detail.startAt), historyDateRange)
    );
  }, [flatBookingItems, historyDateRange]);

  const historyStatusCounts = useMemo(() => {
    const counts = {
      all: dateFilteredBookingItems.length,
      approved: 0,
      inUse: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const item of dateFilteredBookingItems) {
      if (item.isApproved) counts.approved += 1;
      if (item.isInUse) counts.inUse += 1;
      if (item.isPending) counts.pending += 1;
      if (item.isCompleted) counts.completed += 1;
      if (item.isCancelled) counts.cancelled += 1;
    }
    return counts;
  }, [dateFilteredBookingItems]);

  // Filtered booking items
  const filteredBookingItems = useMemo(() => {
    return dateFilteredBookingItems.filter((item) => {
      if (historyStatusFilter !== "ALL") {
        if (historyStatusFilter === "APPROVED" && !item.isApproved) return false;
        if (historyStatusFilter === "IN_USE" && !item.isInUse) return false;
        if (historyStatusFilter === "PENDING" && !item.isPending) return false;
        if (historyStatusFilter === "COMPLETED" && !item.isCompleted) return false;
        if (historyStatusFilter === "CANCELLED" && !item.isCancelled) return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const matchRoom =
          (item.detail.roomName || "").toLowerCase().includes(q) ||
          (item.detail.roomCode || "").toLowerCase().includes(q);
        const matchCode = (item.session?.confirmationCode || "").toLowerCase().includes(q);
        const matchAct = (item.booking.activityName || "").toLowerCase().includes(q);
        const matchId = String(item.booking.id).includes(q);
        return matchRoom || matchCode || matchAct || matchId;
      }
      return true;
    });
  }, [dateFilteredBookingItems, historyStatusFilter, historySearch]);

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

    const validation = validateBookingForm(form, selectedRoomIds, {
      role: user?.role,
    });
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

  // Handle Check-in cả đơn (Nhận phòng) — backend tự kiểm tra cửa sổ [T-15 phút, T)
  async function handleCheckInBooking(booking: BookingResponse) {
    setCheckingInBookingId(booking.id);
    setUsageToast(null);
    try {
      await checkInBookingApi(booking.id);
      setUsageToast({
        type: "success",
        text: `✓ Nhận phòng đơn #${booking.id} thành công! Đơn chuyển sang trạng thái "Đang sử dụng".`,
      });
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error ? err.message : "Nhận phòng thất bại.");
      setUsageToast({ type: "error", text: msg });
      await loadMyBookings();
    } finally {
      setCheckingInBookingId(null);
    }
  }

  // Handle Cancel Booking — mở form chọn lý do (chưa gọi API, chưa đổi trạng thái)
  function openCancelForm(booking: BookingResponse) {
    const eligibility = canCancelBookingOnline(booking, nowWithOffset);
    if (!eligibility.allowed) {
      setUsageToast({
        type: "error",
        text: eligibility.message ?? "Không thể hủy đơn này.",
      });
      return;
    }
    setCancelReasonCode("");
    setCancelReasonDetail("");
    setCancelFormError(null);
    setCancelFormBooking(booking);
  }

  function closeCancelForm() {
    if (isSubmittingCancel) return;
    setCancelFormBooking(null);
    setCancelFormError(null);
  }

  // Bước 1 → 2: validate rồi hiện hộp thoại xác nhận cuối; API chỉ gọi sau xác nhận cuối.
  async function handleContinueCancelForm() {
    const booking = cancelFormBooking;
    if (!booking) return;

    const eligibility = canCancelBookingOnline(booking, nowWithOffset);
    if (!eligibility.allowed) {
      setCancelFormError(eligibility.message ?? "Không thể hủy đơn này.");
      return;
    }

    const validation = validateCancelReasonSelection(cancelReasonCode, cancelReasonDetail);
    if (!validation.isValid) {
      setCancelFormError(validation.error ?? "Lý do hủy không hợp lệ.");
      return;
    }
    setCancelFormError(null);

    const startAt = getBookingStartAt(booking);
    const firstDetail = booking.details?.[0];
    const roomLabel = (booking.details || []).map((d) => d.roomCode || `#${d.roomId}`).join(", ") || "—";
    const timeLabel = startAt
      ? `${startAt.toLocaleDateString("vi-VN")} • ${
          firstDetail ? formatDetailTimeRange(firstDetail) : `${startAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
        }`
      : "—";

    const isConfirmed = await confirm({
      title: "Xác nhận hủy đơn đặt phòng",
      message: `Bạn có chắc chắn muốn hủy đơn đặt phòng #${booking.id} không?`,
      subMessage:
        "Sau khi xác nhận, phòng sẽ được giải phóng và bạn không thể hoàn tác thao tác này.",
      itemDetails: [
        { label: "Phòng đã đặt", value: roomLabel },
        { label: "Ngày & khung giờ", value: timeLabel },
        { label: "Lý do hủy", value: getCancelReasonLabel(cancelReasonCode) },
        ...(cancelReasonCode === "OTHER"
          ? [{ label: "Nội dung chi tiết", value: cancelReasonDetail.trim() }]
          : []),
      ],
      confirmText: "Xác nhận hủy",
      cancelText: "Quay lại",
      type: "danger",
    });

    // Chọn "Quay lại" → trở về form chỉnh sửa, không thay đổi trạng thái đơn.
    if (!isConfirmed) return;

    try {
      setIsSubmittingCancel(true);
      await cancelBookingApi(booking.id, {
        reason: cancelReasonCode,
        reasonDetail: cancelReasonCode === "OTHER" ? cancelReasonDetail.trim() : undefined,
      });
      setCancelFormBooking(null);
      setUsageToast({
        type: "success",
        text: `✓ Đã hủy đơn đặt phòng #${booking.id} thành công. Khung giờ đã được giải phóng.`,
      });
      await loadMyBookings();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err instanceof Error ? err.message : "Hủy đơn thất bại. Vui lòng thử lại.");
      setCancelFormError(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  }

  const scopedAvailableRooms = useMemo(() => {
    if (form.bookingMode !== "time") return availableRooms;
    return filterAvailableRoomsByScope(
      availableRooms,
      isStudent ? "library" : timeRoomScope
    );
  }, [availableRooms, form.bookingMode, isStudent, timeRoomScope]);

  const selectedRoomsList = scopedAvailableRooms.filter((r) =>
    selectedRoomIds.includes(r.roomId)
  );

  const availableRoomGroups = useMemo(
    () => groupAvailableRoomsByType(scopedAvailableRooms),
    [scopedAvailableRooms]
  );

  useEffect(() => {
    if (availableRoomGroups.length === 0) {
      setExpandedRoomTypes([]);
      return;
    }
    setExpandedRoomTypes((prev) => {
      const stillVisible = prev.filter((id) =>
        availableRoomGroups.some((group) => group.roomTypeId === id)
      );
      return stillVisible.length > 0
        ? stillVisible
        : [availableRoomGroups[0].roomTypeId];
    });
  }, [availableRoomGroups]);

  const toggleRoomType = (roomTypeId: number) => {
    setExpandedRoomTypes((prev) =>
      prev.includes(roomTypeId)
        ? prev.filter((id) => id !== roomTypeId)
        : [...prev, roomTypeId]
    );
  };

  const groupCapacityLabel = (group: AvailableRoomGroup): string => {
    const capacities = group.rooms
      .map((room) => room.capacity)
      .filter((value) => Number.isFinite(value) && value > 0);
    if (capacities.length === 0) return "Đang cập nhật sức chứa";
    const min = Math.min(...capacities);
    const max = Math.max(...capacities);
    return min === max ? `${min} chỗ` : `${min}–${max} chỗ`;
  };

  const groupLocationLabel = (group: AvailableRoomGroup): string =>
    summarizeRoomLocations(group.rooms);

  const roomBuildingLabel = (building: string): string => {
    if (building.toLowerCase() === "thư viện") return "Thư viện";
    if (!building || building === "Khác") return "Khu khác";
    return `Tòa ${building}`;
  };

  const roomFloorLabel = (floor: string): string =>
    floor === "—" ? "Khác" : `Tầng ${floor}`;

  const timeScopeOptions: { value: AvailableRoomScope; label: string }[] = [
    { value: "hall", label: "Hội trường" },
    { value: "library", label: "Thư viện" },
    ...(isLecturer
      ? []
      : [{ value: "all" as AvailableRoomScope, label: "Tất cả" }]),
  ];

  const timeScopeLabel =
    timeScopeOptions.find((option) => option.value === timeRoomScope)?.label ??
    "Tất cả";

  return (
    <div className="booking-page">
      <main className="booking-main">
        <div className="booking-container">
          {/* Top Banner */}
          <section className="booking-hero">
            <div className="badge-pill">
              <CalendarIcon size={16} />
              <span>Hệ thống đăng ký & phân phối phòng học HUIT</span>
            </div>
            <h1>
              {isStudent
                ? "Đăng ký mượn phòng dùng chung"
                : isLecturer
                  ? "Đăng ký phòng giảng dạy"
                  : "Đăng ký mượn phòng dùng chung"}
            </h1>
            <p>
              {isLecturer
                ? "Tra cứu phòng trống theo tiết học cho phòng lý thuyết, phòng máy và theo khung giờ cho thư viện, hội trường."
                : "Chọn ngày, tra cứu phòng trống theo tiết học hoặc khung giờ, nhập thông tin hoạt động và gửi yêu cầu phê duyệt nhanh chóng."}
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

                  {/* Sinh viên chỉ đặt theo khung giờ của Thư viện */}
                  {isStudent ? (
                    <div className="student-booking-note">
                      <InfoIcon size={17} />
                      <div>
                        <strong>Khung giờ dành cho sinh viên</strong>
                        <span>
                          Đặt theo giờ, từ 07:00 đến 20:00, tối đa 2 giờ mỗi
                          lượt. Thư viện nghỉ Chủ Nhật. Chỉ áp dụng cho phòng
                          học nhóm và phòng thuyết trình.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mode-segmented-control">
                        <button
                          type="button"
                          className={`seg-btn ${
                            form.bookingMode === "period" ? "active" : ""
                          }`}
                          onClick={() => handleBookingModeChange("period")}
                        >
                          Mượn theo Tiết học (Phòng lý thuyết, Lab)
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${
                            form.bookingMode === "time" ? "active" : ""
                          }`}
                          onClick={() => handleBookingModeChange("time")}
                        >
                          Mượn theo Khung giờ (Hội trường, Thư viện)
                        </button>
                      </div>
                    </>
                  )}

                  {errors.bookingMode && (
                    <span className="err-text">{errors.bookingMode}</span>
                  )}

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
                      min={toISODateString(new Date())}
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
                    <>
                      {periodGroups.length > 1 && (
                        <div className="form-group">
                          <label className="form-label" htmlFor="period-schedule">
                            Sử dụng phòng: <span className="req">*</span>
                          </label>
                          <select
                            id="period-schedule"
                            className="form-select"
                            value={activePeriodGroup?.roomTypeId ?? ""}
                            onChange={(e) =>
                              handlePeriodScheduleChange(e.target.value)
                            }
                          >
                            {periodGroups.map((group) => (
                              <option
                                key={group.roomTypeId}
                                value={group.roomTypeId}
                              >
                                {group.roomTypeName}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="form-row">
                        <div className="form-group flex-1">
                          <label className="form-label" htmlFor="start-period">
                            Tiết bắt đầu: <span className="req">*</span>
                          </label>
                          <select
                            id="start-period"
                            className="form-select"
                            value={form.startPeriodId || ""}
                            onChange={(e) => {
                              const nextStartId = Number(e.target.value);
                              const nextStartIdx = activePeriods.findIndex(
                                (p) => p.id === nextStartId
                              );
                              setForm((prev) => {
                                const prevEndIdx = activePeriods.findIndex(
                                  (p) => p.id === prev.endPeriodId
                                );
                                const endId =
                                  prevEndIdx >= nextStartIdx
                                    ? prev.endPeriodId
                                    : (activePeriods[nextStartIdx + 1]?.id ??
                                      nextStartId);
                                return {
                                  ...prev,
                                  startPeriodId: nextStartId,
                                  endPeriodId: endId,
                                };
                              });
                            }}
                          >
                            {selectableStartPeriods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {formatPeriodLabel(p)}
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
                            onChange={(e) => {
                              const nextEndId = Number(e.target.value);
                              const nextEndIdx = activePeriods.findIndex(
                                (p) => p.id === nextEndId
                              );
                              if (
                                nextEndIdx < 0 ||
                                nextEndIdx < selectedStartIndex
                              ) {
                                return;
                              }
                              setForm((prev) => ({
                                ...prev,
                                endPeriodId: nextEndId,
                              }));
                            }}
                          >
                            {selectableEndPeriods.map((p) => (
                              <option key={p.id} value={p.id}>
                                {formatPeriodLabel(p)}
                              </option>
                            ))}
                          </select>
                          {errors.endPeriodId && (
                            <span className="err-text">{errors.endPeriodId}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="period-reset-btn"
                          onClick={handleResetPeriods}
                          title="Đặt lại tiết mặc định"
                          aria-label="Đặt lại tiết mặc định"
                          disabled={selectableStartPeriods.length === 0}
                        >
                          <RefreshCwIcon size={16} />
                        </button>
                      </div>
                    </>
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
                          className={`form-input ${
                            errors.startTime ? "input-error" : ""
                          }`}
                          value={form.startTime}
                          min={isStudent ? STUDENT_OPEN_TIME : undefined}
                          max={isStudent ? STUDENT_CLOSE_TIME : undefined}
                          step={isStudent ? 900 : undefined}
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
                          className={`form-input ${
                            errors.endTime ? "input-error" : ""
                          }`}
                          value={form.endTime}
                          min={isStudent ? form.startTime : undefined}
                          max={isStudent ? STUDENT_CLOSE_TIME : undefined}
                          step={isStudent ? 900 : undefined}
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

                  {form.bookingMode === "time" && !isStudent && (
                    <div className="form-group">
                      <span className="form-label">Khu vực phòng:</span>
                      <div className="mode-segmented-control time-scope-control">
                        {timeScopeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`seg-btn ${
                              timeRoomScope === option.value ? "active" : ""
                            }`}
                            onClick={() => handleTimeScopeChange(option.value)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isStudent && form.bookingMode === "time" && (
                    <div className="student-time-hint">
                      <ClockIcon size={14} />
                      <span>
                        Thư viện mở cửa 07:00 – 20:00. Mỗi lượt đặt không quá 2
                        giờ và không nhận ngày Chủ Nhật.
                      </span>
                    </div>
                  )}

                  <div className="form-action-row">
                    <button
                      type="button"
                      className="btn-outline full-width"
                      onClick={() => searchRooms()}
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
                      <span>Gửi yêu cầu</span>
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
                          ? `${selectedStartPeriod ? formatPeriodLabel(selectedStartPeriod) : "Tiết đầu"} → ${selectedEndPeriod ? formatPeriodLabel(selectedEndPeriod) : "Tiết cuối"}`
                          : `${form.startTime} — ${form.endTime} • ${
                              isStudent ? "Thư viện" : timeScopeLabel
                            }`}
                      </p>
                    </div>
                    <span className="rooms-count-pill">
                      {scopedAvailableRooms.length} phòng khả dụng
                    </span>
                  </div>

                  {isSearchingRooms && (
                    <div className="room-state-box">
                      <div className="spinner"></div>
                      <span>Đang kiểm tra phòng trống...</span>
                    </div>
                  )}

                  {!isSearchingRooms && scopedAvailableRooms.length === 0 && hasSearched && (
                    <div className="room-empty-card">
                      <InfoIcon size={32} />
                      <h4>Không tìm thấy phòng trống phù hợp</h4>
                      <p>
                        {isStudent
                          ? "Phòng học nhóm và phòng thuyết trình trong khung giờ này đã có lịch hoặc đang bảo trì. Bạn vui lòng chọn khung giờ khác trong 07:00 – 20:00."
                          : form.bookingMode === "time"
                            ? timeRoomScope === "hall"
                              ? "Phòng hội thảo đã có lịch trong khung giờ này. Bạn vui lòng chọn khung giờ khác."
                              : timeRoomScope === "library"
                                ? "Phòng học nhóm và phòng thuyết trình đã có lịch trong khung giờ này. Bạn vui lòng chọn khung giờ khác."
                                : "Tất cả phòng đặt theo khung giờ đã có lịch. Bạn vui lòng chọn ngày hoặc khung giờ khác."
                            : "Tất cả các phòng trong khung giờ này đã có lịch đặt hoặc đang bảo trì. Bạn vui lòng chọn ngày hoặc khung giờ khác."}
                      </p>
                    </div>
                  )}

                  {availableRoomGroups.length > 0 && (
                    <div className="room-type-groups">
                      {availableRoomGroups.map((group) => {
                        const isOpen = expandedRoomTypes.includes(
                          group.roomTypeId
                        );
                        const selectedInGroup = group.rooms.filter((room) =>
                          selectedRoomIds.includes(room.roomId)
                        ).length;
                        const buildingGroups = groupAvailableRoomsByBuilding(
                          group.rooms
                        );
                        const selectedBuilding =
                          buildingGroups.find(
                            (building) =>
                              building.building ===
                              activeRoomBuilding[group.roomTypeId]
                          ) ?? buildingGroups[0];
                        const selectedFloor =
                          selectedBuilding?.floors.find(
                            (floor) =>
                              floor.floor === activeRoomFloor[group.roomTypeId]
                          ) ?? selectedBuilding?.floors[0];

                        return (
                          <section
                            key={group.roomTypeId}
                            className={`room-type-group ${
                              isOpen ? "is-open" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="room-type-group-head"
                              onClick={() =>
                                toggleRoomType(group.roomTypeId)
                              }
                              aria-expanded={isOpen}
                            >
                              <span className="room-type-group-icon">
                                <UsersIcon size={17} />
                              </span>
                              <span className="room-type-group-main">
                                <strong>{group.roomTypeName}</strong>
                                <small>
                                  {group.rooms.length} phòng •{" "}
                                  {groupCapacityLabel(group)} •{" "}
                                  {groupLocationLabel(group)}
                                </small>
                              </span>
                              {selectedInGroup > 0 && (
                                <span className="room-type-selected-pill">
                                  Đã chọn {selectedInGroup}
                                </span>
                              )}
                              <ChevronRightIcon
                                size={18}
                                className={`room-type-chevron ${
                                  isOpen ? "is-open" : ""
                                }`}
                              />
                            </button>

                            {isOpen && selectedBuilding && selectedFloor && (
                              <div className="room-browser">
                                {buildingGroups.length > 1 ? (
                                  <div
                                    className="room-building-tabs"
                                    role="tablist"
                                    aria-label="Chọn tòa nhà"
                                  >
                                    {buildingGroups.map((building) => {
                                      const isActive =
                                        building.building ===
                                        selectedBuilding.building;
                                      return (
                                        <button
                                          key={building.building}
                                          type="button"
                                          role="tab"
                                          aria-selected={isActive}
                                          className={`room-building-tab ${
                                            isActive ? "active" : ""
                                          }`}
                                          onClick={() =>
                                            setActiveRoomBuilding((prev) => ({
                                              ...prev,
                                              [group.roomTypeId]:
                                                building.building,
                                            }))
                                          }
                                        >
                                          <span>
                                            {roomBuildingLabel(
                                              building.building
                                            )}
                                          </span>
                                          <small>
                                            {building.rooms.length} phòng
                                          </small>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="room-single-location">
                                    {roomBuildingLabel(selectedBuilding.building)}
                                  </div>
                                )}

                                <div
                                  className="room-floor-tabs"
                                  role="tablist"
                                  aria-label="Chọn tầng"
                                >
                                  {selectedBuilding.floors.map((floor) => {
                                    const isActive =
                                      floor.floor === selectedFloor.floor;
                                    return (
                                      <button
                                        key={floor.floor}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`room-floor-tab ${
                                          isActive ? "active" : ""
                                        }`}
                                        onClick={() =>
                                          setActiveRoomFloor((prev) => ({
                                            ...prev,
                                            [group.roomTypeId]: floor.floor,
                                          }))
                                        }
                                      >
                                        <span>
                                          {roomFloorLabel(floor.floor)}
                                        </span>
                                        <small>{floor.rooms.length}</small>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="room-tile-grid">
                                  {selectedFloor.rooms.map((room) => {
                                    const isSelected =
                                      selectedRoomIds.includes(room.roomId);
                                    return (
                                      <div
                                        key={room.roomId}
                                        className={`room-tile ${
                                          isSelected ? "is-selected" : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="room-tile-select"
                                          onClick={() =>
                                            toggleRoom(room.roomId)
                                          }
                                          aria-pressed={isSelected}
                                          title={`${room.roomName} • ${room.capacity} chỗ`}
                                        >
                                          <span className="room-tile-head">
                                            <span className="room-code-tag">
                                              {room.roomCode}
                                            </span>
                                            <span className="room-tile-capacity">
                                              {room.capacity} chỗ
                                            </span>
                                          </span>
                                          <span className="room-tile-name">
                                            {room.roomName}
                                          </span>
                                          <span className="room-tile-check">
                                            {isSelected
                                              ? "✓ Đã chọn"
                                              : "Chọn phòng"}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          className="room-tile-schedule"
                                          onClick={() =>
                                            navigate(
                                              `/lich-phong?roomId=${room.roomId}&date=${form.date}`
                                            )
                                          }
                                          title={`Xem lịch ${room.roomCode}`}
                                        >
                                          Lịch
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}

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
                <div className="user-bookings-list-container">
                  {/* Date filter: ngày mượn */}
                  <div className="user-bookings-date-filter-bar">
                    <span className="user-bookings-date-label">Ngày mượn</span>

                    <div
                      className="user-bookings-date-presets"
                      role="group"
                      aria-label="Lọc nhanh theo ngày mượn"
                    >
                      {([
                        { value: "all", label: "Tất cả" },
                        { value: "today", label: "Hôm nay" },
                        { value: "last7", label: "7 ngày qua" },
                        { value: "month", label: "Tháng này" },
                      ] as const).map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={`user-bookings-date-chip ${
                            historyDateFilter === preset.value ? "active" : ""
                          }`}
                          onClick={() => handleDateFilterChange(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div
                      className={`user-bookings-date-custom ${
                        historyDateFilter === "custom" ? "is-active" : ""
                      }`}
                    >
                      <span className="user-bookings-date-custom-label">
                        Khoảng ngày
                      </span>
                      <input
                        type="text"
                        className="user-bookings-date-input"
                        placeholder="dd/mm/yyyy"
                        aria-label="Từ ngày"
                        inputMode="numeric"
                        maxLength={10}
                        value={customDateFrom}
                        onChange={(event) => {
                          setCustomDateFrom(event.target.value);
                          setDateFilterError("");
                        }}
                      />
                      <span className="user-bookings-date-sep">–</span>
                      <input
                        type="text"
                        className="user-bookings-date-input"
                        placeholder="dd/mm/yyyy"
                        aria-label="Đến ngày"
                        inputMode="numeric"
                        maxLength={10}
                        value={customDateTo}
                        onChange={(event) => {
                          setCustomDateTo(event.target.value);
                          setDateFilterError("");
                        }}
                      />
                      <button
                        type="button"
                        className="user-bookings-date-apply"
                        onClick={handleApplyCustomDateRange}
                      >
                        Áp dụng
                      </button>
                    </div>

                    {dateFilterError && (
                      <p className="user-bookings-date-error" role="alert">
                        {dateFilterError}
                      </p>
                    )}
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="user-bookings-filter-bar">
                    <div className="user-bookings-filter-tabs">
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("ALL")}
                      >
                        Tất cả ({historyStatusCounts.all})
                      </button>
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "APPROVED" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("APPROVED")}
                      >
                        Đã duyệt ({historyStatusCounts.approved})
                      </button>
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "IN_USE" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("IN_USE")}
                      >
                        Đang sử dụng ({historyStatusCounts.inUse})
                      </button>
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "PENDING" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("PENDING")}
                      >
                        Chờ duyệt ({historyStatusCounts.pending})
                      </button>
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "COMPLETED" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("COMPLETED")}
                      >
                        Hoàn thành ({historyStatusCounts.completed})
                      </button>
                      <button
                        type="button"
                        className={`user-bookings-filter-tab ${historyStatusFilter === "CANCELLED" ? "active" : ""}`}
                        onClick={() => setHistoryStatusFilter("CANCELLED")}
                      >
                        Đã hủy ({historyStatusCounts.cancelled})
                      </button>
                    </div>

                    <input
                      type="text"
                      className="user-bookings-search-input"
                      placeholder="Tìm theo phòng, mã nhận phòng, hoạt động..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                  </div>

                  {/* Compact Table / List View */}
                  {filteredBookingItems.length === 0 ? (
                    <div className="table-empty-box" style={{ padding: "40px 20px" }}>
                      <p>
                        {historyDateRange
                          ? `Không có đơn phù hợp với khoảng ngày ${formatDdMmYyyy(
                              historyDateRange.from
                            )} – ${formatDdMmYyyy(historyDateRange.to)}.`
                          : "Không tìm thấy lịch đặt phòng nào phù hợp với bộ lọc."}
                      </p>
                      {historyDateRange && (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => handleDateFilterChange("all")}
                        >
                          Xóa lọc ngày
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="user-bookings-table-wrapper">
                      <table className="user-bookings-table">
                        <thead>
                          <tr>
                            <th>Đơn / Hoạt động</th>
                            <th>Tên phòng</th>
                            <th>Khung giờ (Bắt đầu - Kết thúc)</th>
                            <th>Mã nhận phòng</th>
                            <th>Trạng thái đơn</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookingItems.map((item) => {
                            const checkInInfo = item.booking.checkInWindow?.startAt
                              ? evaluateCheckInWindow(item.booking.checkInWindow.startAt, nowWithOffset)
                              : null;

                            return (
                              <tr key={`${item.booking.id}-${item.detail.id}`}>
                                {/* Đơn / Hoạt động */}
                                <td className="table-booking-id-col">
                                  <div className="table-id-badge">#{item.booking.id}</div>
                                  <div
                                    className="table-act-title"
                                    title={item.booking.activityName}
                                  >
                                    {item.booking.activityName || "Đặt phòng sinh hoạt/học tập"}
                                  </div>
                                </td>

                                {/* Tên phòng */}
                                <td className="table-room-col">
                                  <div className="table-room-cell">
                                    {item.detail.roomCode && item.detail.roomCode !== "—" && (
                                      <span className="table-room-code-tag">
                                        {item.detail.roomCode}
                                      </span>
                                    )}
                                    <span className="table-room-name">
                                      {item.detail.roomName || "—"}
                                    </span>
                                  </div>
                                </td>

                                {/* Khung giờ (Bắt đầu - Kết thúc) */}
                                <td className="table-time-col">
                                  <div className="table-time-cell">
                                    <span className="table-time-range">
                                      <ClockIcon size={13} />
                                      {formatDetailTimeRange(item.detail)}
                                    </span>
                                    <span className="table-time-date">
                                      {new Date(item.detail.startAt).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                </td>

                                {/* Mã nhận phòng */}
                                <td className="table-code-col">
                                  {item.session?.confirmationCode ? (
                                    <div className="table-code-wrapper">
                                      <span className="table-code-val" title="Mã nhận phòng">
                                        {item.session.confirmationCode}
                                      </span>
                                      <button
                                        type="button"
                                        className="btn-copy-mini"
                                        title="Sao chép mã"
                                        onClick={() => {
                                          navigator.clipboard.writeText(item.session!.confirmationCode);
                                          alert(`Đã sao chép mã nhận phòng: ${item.session!.confirmationCode}`);
                                        }}
                                      >
                                        <CopyIcon size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="table-empty-code">—</span>
                                  )}
                                </td>

                                {/* Trạng thái đơn */}
                                <td className="table-status-col">
                                  {item.isInUse ? (
                                    <span className="badge-in-use-pill">
                                      <span className="pulse-dot-green"></span>
                                      Đang sử dụng
                                    </span>
                                  ) : (
                                    <div style={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
                                      <span className={`badge-status ${item.statusBadge.cssClass}`}>
                                        {item.statusBadge.label}
                                      </span>
                                      {checkInInfo && item.isApproved && (
                                        <span className={`checkin-countdown ${checkInInfo.state}`} style={{ fontSize: "11px" }}>
                                          {checkInInfo.message}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Thao tác */}
                                <td className="table-actions-col">
                                  <div className="table-actions-group">
                                    {/* Chỉ render nút 'Hủy' khi trạng thái dòng đó là 'Đã duyệt' và người dùng chưa Check-in */}
                                    {item.canCancel && (
                                      <>
                                        <button
                                          type="button"
                                          className="btn-table-checkin"
                                          disabled={
                                            directCheckingInId === item.detail.id ||
                                            checkingInBookingId === item.booking.id ||
                                            (checkInInfo !== null && checkInInfo.state !== "open")
                                          }
                                          onClick={() => {
                                            if (item.detail.roomId > 0) {
                                              handleDirectCheckIn(item.detail, item.session);
                                            } else {
                                              handleCheckInBooking(item.booking);
                                            }
                                          }}
                                          title={
                                            checkInInfo && checkInInfo.state !== "open"
                                              ? checkInInfo.message
                                              : "Xác nhận nhận phòng ngay"
                                          }
                                        >
                                          {directCheckingInId === item.detail.id ? (
                                            <>
                                              <HourglassIcon size={13} />
                                              <span>Đang nhận...</span>
                                            </>
                                          ) : (
                                            <>
                                              <ZapIcon size={13} />
                                              <span>Nhận phòng</span>
                                            </>
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          className="btn-table-detail"
                                          onClick={() => openCheckInModal(item.detail, item.booking, item.session)}
                                          title="Xem chi tiết nhận phòng"
                                        >
                                          Chi tiết
                                        </button>

                                        <button
                                          type="button"
                                          className="btn-table-cancel"
                                          onClick={() => openCancelForm(item.booking)}
                                          title="Hủy đơn đặt phòng (bắt buộc chọn lý do)"
                                        >
                                          <BanIcon size={13} />
                                          <span>Hủy</span>
                                        </button>
                                      </>
                                    )}

                                    {item.isCancelExpired && (
                                      <span className="cancel-deadline-note">
                                        Đã quá hạn hủy trực tuyến — liên hệ quản lý thư viện
                                      </span>
                                    )}

                                    {item.isInUse && (
                                      <>
                                        <button
                                          type="button"
                                          className="btn-table-checkout"
                                          onClick={() => openCheckOutModal(item.detail, item.booking, item.session)}
                                          title="Xác nhận trả phòng"
                                        >
                                          <CheckIcon size={13} />
                                          <span>Trả phòng</span>
                                        </button>

                                        <button
                                          type="button"
                                          className="btn-table-detail"
                                          onClick={() => setViewingDetailItem(item)}
                                          title="Xem chi tiết"
                                        >
                                          Chi tiết
                                        </button>
                                      </>
                                    )}

                                    {!item.canCancel && !item.isInUse && (
                                      <button
                                        type="button"
                                        className="btn-table-detail"
                                        onClick={() => setViewingDetailItem(item)}
                                        title="Xem chi tiết đơn"
                                      >
                                        Chi tiết
                                      </button>
                                    )}

                                    {/* Lịch sử duyệt đơn */}
                                    <button
                                      type="button"
                                      className="btn-table-history"
                                      onClick={() => openApprovalHistoryModal(item.booking.id, item.booking.activityName)}
                                      title="Xem lịch sử duyệt đơn"
                                    >
                                      <HistoryIcon size={13} />
                                      <span>Lịch sử</span>
                                    </button>

                                    {/* Đánh giá sau khi sử dụng */}
                                    {(item.booking.checkedInAt || item.isInUse || item.detail.status === "Hoàn thành" || item.session?.status === "Đã kết thúc") && (
                                      <button
                                        type="button"
                                        className="btn-table-feedback"
                                        onClick={() => openFeedbackModal(item.booking.id, item.detail.roomName)}
                                        title="Đánh giá chất lượng và trải nghiệm phòng"
                                      >
                                        <StarIcon size={13} />
                                        <span>Đánh giá</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
          {/* VIEW DETAIL MODAL */}
          {viewingDetailItem && (
            <div
              className="admin-modal-overlay modal-backdrop"
              onClick={() => setViewingDetailItem(null)}
            >
              <div
                className="admin-modal-box modal-dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "560px" }}
              >
                <div className="modal-header">
                  <div className="modal-title-wrap">
                    <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <InfoIcon size={18} />
                      Chi tiết đơn đặt phòng #{viewingDetailItem.booking.id}
                    </h3>
                    <span className="modal-subtitle">
                      Ngày tạo: {new Date(viewingDetailItem.booking.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setViewingDetailItem(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="user-modal-summary">
                    <div className="user-modal-summary-row">
                      <span>Tên hoạt động:</span>
                      <strong>{viewingDetailItem.booking.activityName || "—"}</strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Phòng:</span>
                      <strong>
                        {viewingDetailItem.detail.roomCode && `[${viewingDetailItem.detail.roomCode}] `}
                        {viewingDetailItem.detail.roomName || "—"}
                      </strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Khung giờ:</span>
                      <strong>
                        {formatDetailTimeRange(viewingDetailItem.detail)} •{" "}
                        {new Date(viewingDetailItem.detail.startAt).toLocaleDateString("vi-VN")}
                      </strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Mục đích:</span>
                      <span>{viewingDetailItem.booking.purpose || "—"}</span>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Trạng thái:</span>
                      <span className={`badge-status ${viewingDetailItem.statusBadge.cssClass}`}>
                        {viewingDetailItem.statusBadge.label}
                      </span>
                    </div>
                    {viewingDetailItem.session?.confirmationCode && (
                      <div className="user-modal-summary-row">
                        <span>Mã nhận phòng:</span>
                        <strong className="text-primary">
                          {viewingDetailItem.session.confirmationCode}
                        </strong>
                      </div>
                    )}
                    {viewingDetailItem.session?.actualCheckIn && (
                      <div className="user-modal-summary-row">
                        <span>Nhận phòng lúc:</span>
                        <span>
                          {new Date(viewingDetailItem.session.actualCheckIn).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                    {viewingDetailItem.session?.actualCheckOut && (
                      <div className="user-modal-summary-row">
                        <span>Trả phòng lúc:</span>
                        <span>
                          {new Date(viewingDetailItem.session.actualCheckOut).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                    {viewingDetailItem.booking.note && (
                      <div className="user-modal-summary-row">
                        <span>Ghi chú:</span>
                        <span>{viewingDetailItem.booking.note}</span>
                      </div>
                    )}
                    {viewingDetailItem.booking.rejectionReason && (
                      <div className="user-modal-summary-row" style={{ color: "#dc2626" }}>
                        <span>Lý do từ chối:</span>
                        <span>{viewingDetailItem.booking.rejectionReason}</span>
                      </div>
                    )}
                    {viewingDetailItem.booking.status === "Đã hủy" && (
                      <div className="user-modal-summary-row" style={{ color: "#64748b" }}>
                        <span>Thông tin hủy:</span>
                        <span>
                          {describeCancelSource(viewingDetailItem.booking).label}:{" "}
                          {describeCancelReason(viewingDetailItem.booking)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      const bId = viewingDetailItem.booking.id;
                      const act = viewingDetailItem.booking.activityName;
                      setViewingDetailItem(null);
                      openApprovalHistoryModal(bId, act);
                    }}
                  >
                    <HistoryIcon size={13} />
                    <span>Lịch sử duyệt</span>
                  </button>

                  {(viewingDetailItem.booking.checkedInAt || viewingDetailItem.isInUse || viewingDetailItem.detail.status === "Hoàn thành" || viewingDetailItem.session?.status === "Đã kết thúc") && (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        const bId = viewingDetailItem.booking.id;
                        const rName = viewingDetailItem.detail.roomName;
                        setViewingDetailItem(null);
                        openFeedbackModal(bId, rName);
                      }}
                    >
                      <StarIcon size={13} />
                      <span>Đánh giá phòng</span>
                    </button>
                  )}

                  {viewingDetailItem.isCancelExpired && (
                    <span className="cancel-deadline-note">
                      Đã quá hạn hủy trực tuyến — liên hệ quản lý thư viện
                    </span>
                  )}
                  {viewingDetailItem.canCancel && (
                    <button
                      type="button"
                      className="btn-table-cancel"
                      onClick={() => {
                        const target = viewingDetailItem.booking;
                        setViewingDetailItem(null);
                        openCancelForm(target);
                      }}
                    >
                      <BanIcon size={13} />
                      <span>Hủy lịch nhận phòng</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setViewingDetailItem(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* CANCEL BOOKING FORM MODAL (2 bước: chọn lý do → xác nhận cuối) */}
          {cancelFormBooking && (
            <div
              className="admin-modal-overlay modal-backdrop"
              onClick={closeCancelForm}
            >
              <div
                className="admin-modal-box modal-dialog cancel-booking-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="modal-title-wrap">
                    <h3 style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <BanIcon size={18} />
                      Hủy đơn đặt phòng #{cancelFormBooking.id}
                    </h3>
                    <span className="modal-subtitle">
                      Đơn chỉ bị hủy sau khi bạn xác nhận ở bước cuối cùng
                    </span>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={closeCancelForm}
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="user-modal-summary">
                    <div className="user-modal-summary-row">
                      <span>Hoạt động:</span>
                      <strong>{cancelFormBooking.activityName}</strong>
                    </div>
                    <div className="user-modal-summary-row">
                      <span>Phòng đã đặt:</span>
                      <strong>
                        {(cancelFormBooking.details || [])
                          .map((d) => d.roomCode || `#${d.roomId}`)
                          .join(", ") || "—"}
                      </strong>
                    </div>
                    {cancelFormBooking.details?.[0] && (
                      <div className="user-modal-summary-row">
                        <span>Ngày & khung giờ:</span>
                        <strong>
                          {new Date(
                            cancelFormBooking.details[0].startAt
                          ).toLocaleDateString("vi-VN")}{" "}
                          • {formatDetailTimeRange(cancelFormBooking.details[0])}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Lý do hủy (bắt buộc):
                    </label>
                    <div className="cancel-reason-options">
                      {CANCEL_REASON_OPTIONS.map((option) => (
                        <label
                          key={option.code}
                          className={`cancel-reason-option ${
                            cancelReasonCode === option.code ? "selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="cancelReason"
                            value={option.code}
                            checked={cancelReasonCode === option.code}
                            onChange={() => setCancelReasonCode(option.code)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {cancelReasonCode === "OTHER" && (
                    <div className="form-group">
                      <label className="form-label">
                        Nội dung giải thích (bắt buộc):
                      </label>
                      <textarea
                        rows={3}
                        className="form-input"
                        placeholder="Mô tả cụ thể lý do bạn hủy đơn đặt phòng..."
                        value={cancelReasonDetail}
                        onChange={(e) => setCancelReasonDetail(e.target.value)}
                      />
                    </div>
                  )}

                  {cancelFormError && (
                    <div className="cancel-form-error">{cancelFormError}</div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={closeCancelForm}
                    disabled={isSubmittingCancel}
                  >
                    Quay lại / Đóng
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleContinueCancelForm}
                    disabled={isSubmittingCancel}
                  >
                    Tiếp tục
                  </button>
                </div>
              </div>
            </div>
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
          {/* FEEDBACK MODAL */}
          <FeedbackModal
            isOpen={feedbackModalOpen}
            bookingId={feedbackBookingId}
            roomName={feedbackRoomName}
            onClose={() => setFeedbackModalOpen(false)}
            onSuccess={() => {
              loadMyBookings();
            }}
          />

          {/* APPROVAL HISTORY AUDIT TRAIL MODAL */}
          <ApprovalHistoryModal
            isOpen={historyModalOpen}
            bookingId={historyBookingId}
            activityName={historyActivityName}
            onClose={() => setHistoryModalOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}
