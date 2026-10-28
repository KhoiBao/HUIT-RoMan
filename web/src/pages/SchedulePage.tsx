import { useState, useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isStudentBookableRoomType, isStudentRole } from "../lib/booking";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  RefreshCwIcon,
  XIcon,
} from "../components/Icon";
import {
  type Period,
  type RoomItem,
  type RoomScheduleItem,
  type TimelineSegment,
  MATRIX_TIMELINE_START_MIN,
  MATRIX_TIMELINE_END_MIN,
  toISODateString,
  timeStringToMinutes,
  fetchPeriodsApi,
  formatVietnameseDate,
  formatShortDate,
  parseVietnamTimeMinutes,
  minutesToTimeString,
  calculateCurrentTimeIndicator,
  buildRoomTimelineSegments,
  computeTimelineWindow,
  getRoomBadgeInfo,
  normalizeRoomStatus,
  parseRoomAmenities,
  getScheduleStatusBadge,
  fetchAllRoomsApi,
  fetchPagedRoomsApi,
  fetchSchedulesRangeApi,
  getWeekDays,
  getMonthGrid,
  buildDayStats,
  groupSchedulesByRoom,
  groupSchedulesByRoomAndDate,
  toVietnamDateKey,
  getSuggestedBookingSlot,
} from "../lib/schedule";

type ViewMode = "day" | "week" | "month";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function buildPageItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) pages.add(2).add(3).add(4);
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3);

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

interface DetailSelection {
  room: RoomItem;
  segment: TimelineSegment;
}

function parseViewMode(value: string | null): ViewMode {
  return value === "week" || value === "month" ? value : "day";
}

function isActiveSchedule(item: RoomScheduleItem): boolean {
  return item.status !== "Từ chối" && item.status !== "Đã hủy";
}

function keyboardActivate(action: () => void) {
  return (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isStudent = isStudentRole(user?.role);

  const [periods, setPeriods] = useState<Period[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(
    searchParams.get("date") || toISODateString(new Date())
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    parseViewMode(searchParams.get("view"))
  );

  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterBuilding, setFilterBuilding] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [now, setNow] = useState<Date>(() => new Date());

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomsReloadToken, setRoomsReloadToken] = useState<number>(0);

  const [pagedRooms, setPagedRooms] = useState<RoomItem[]>([]);
  const [pagedPage, setPagedPage] = useState<number>(1);
  const [pagedPageSize, setPagedPageSize] = useState<number>(10);
  const [pagedTotalItems, setPagedTotalItems] = useState<number>(0);
  const [pagedTotalPages, setPagedTotalPages] = useState<number>(0);
  const [pagedLoading, setPagedLoading] = useState<boolean>(true);
  const [pagedError, setPagedError] = useState<string | null>(null);
  const [pagedReloadToken, setPagedReloadToken] = useState<number>(0);
  const listTopRef = useRef<HTMLDivElement>(null);

  const [rangeSchedules, setRangeSchedules] = useState<RoomScheduleItem[]>([]);
  const [loadedRangeKey, setLoadedRangeKey] = useState<string>("");
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(true);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(
    null
  );

  // Đồng hồ nội bộ: cập nhật mỗi 30 giây để vạch giờ hiện tại và trạng thái
  // "đã qua" luôn đúng mà không cần tải lại trang.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Tự làm mới dữ liệu mỗi 60 giây khi tab đang hiển thị.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setReloadToken((token) => token + 1);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayKey = toISODateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = selectedDate === todayKey;
  const isPastDate = selectedDate < todayKey;

  // 1. Danh mục phòng
  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const allRooms = await fetchAllRoomsApi();
        if (cancelled) return;
        const sorted = [...allRooms].sort((a, b) => {
          const floorCompare = (a.floor ?? "").localeCompare(
            b.floor ?? "",
            "vi",
            { numeric: true }
          );
          if (floorCompare !== 0) return floorCompare;
          return (a.roomCode ?? "").localeCompare(b.roomCode ?? "", "vi", {
            numeric: true,
          });
        });
        setRooms(sorted);
      } catch (err: unknown) {
        if (cancelled) return;
        setRoomsError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh mục phòng từ máy chủ."
        );
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [roomsReloadToken]);

  // 1a. Danh mục phòng có phân trang cho chế độ Ngày/Tuần. Bộ lọc và trạng
  // thái được xử lý ở máy chủ để số trang và tổng phòng luôn chính xác.
  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setPagedLoading(true);
      setPagedError(null);
      try {
        const result = await fetchPagedRoomsApi({
          page: pagedPage,
          pageSize: pagedPageSize,
          keyword: filterKeyword,
          roomType: filterType,
          building: filterBuilding,
          floor: filterFloor,
          status: filterStatus,
          date: selectedDate,
        });
        if (cancelled) return;
        setPagedRooms(result.items);
        setPagedTotalItems(result.totalItems);
        setPagedTotalPages(result.totalPages);
        if (result.page !== pagedPage) setPagedPage(result.page);
      } catch (err: unknown) {
        if (cancelled) return;
        setPagedRooms([]);
        setPagedTotalItems(0);
        setPagedTotalPages(0);
        setPagedError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh mục phòng từ máy chủ."
        );
      } finally {
        if (!cancelled) setPagedLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    pagedPage,
    pagedPageSize,
    filterKeyword,
    filterType,
    filterBuilding,
    filterFloor,
    filterStatus,
    selectedDate,
    pagedReloadToken,
  ]);

  // 1b. Lịch tiết của từng loại phòng (lý thuyết / thực hành) để mở rộng
  // timeline và quy đổi khung giờ trống sang tiết học khi đặt phòng.
  useEffect(() => {
    let cancelled = false;

    async function loadPeriods() {
      try {
        const list = await fetchPeriodsApi();
        if (!cancelled) setPeriods(list);
      } catch {
        if (!cancelled) setPeriods([]);
      }
    }

    loadPeriods();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Lịch của toàn bộ phòng trong khoảng ngày đang xem
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  const rangeBounds = useMemo(() => {
    if (viewMode === "week") {
      return { from: weekDays[0], to: weekDays[weekDays.length - 1] };
    }
    if (viewMode === "month") {
      return {
        from: monthGrid[0].dateKey,
        to: monthGrid[monthGrid.length - 1].dateKey,
      };
    }
    return { from: selectedDate, to: selectedDate };
  }, [viewMode, selectedDate, weekDays, monthGrid]);

  const rangeKey = `${rangeBounds.from}|${rangeBounds.to}`;
  const loadedRangeKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    const fromDate = rangeBounds.from;
    const toDate = rangeBounds.to;
    const currentRangeKey = `${fromDate}|${toDate}`;

    async function loadSchedules() {
      setSchedulesLoading(true);
      setSchedulesError(null);
      try {
        const items = await fetchSchedulesRangeApi(fromDate, toDate);
        if (cancelled) return;
        setRangeSchedules(items);
        loadedRangeKeyRef.current = currentRangeKey;
        setLoadedRangeKey(currentRangeKey);
        setLastUpdated(new Date());
      } catch (err: unknown) {
        if (cancelled) return;
        // Chỉ xóa dữ liệu khi chưa từng tải được khoảng ngày này; lỗi khi tự
        // làm mới nền vẫn giữ lịch đang hiển thị.
        if (loadedRangeKeyRef.current !== currentRangeKey) {
          setRangeSchedules([]);
        }
        setSchedulesError(
          err instanceof Error ? err.message : "Không thể tải lịch phòng."
        );
      } finally {
        if (!cancelled) setSchedulesLoading(false);
      }
    }

    loadSchedules();
    return () => {
      cancelled = true;
    };
  }, [rangeBounds.from, rangeBounds.to, reloadToken, todayKey]);

  const isRangeLoading = schedulesLoading && loadedRangeKey !== rangeKey;
  const viewsBlocked = Boolean(schedulesError) && loadedRangeKey !== rangeKey;

  function updateLocation(nextDate: string, nextView: ViewMode) {
    setSelectedDate(nextDate);
    setViewMode(nextView);
    setDetailSelection(null);
    setPagedPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", nextDate);
      next.set("view", nextView);
      return next;
    });
  }

  function handleDateChange(newDate: string) {
    updateLocation(newDate, viewMode);
  }

  function handleViewChange(nextView: ViewMode) {
    updateLocation(selectedDate, nextView);
  }

  function shiftDate(direction: number) {
    const [year, month, day] = selectedDate.split("-").map(Number);
    if (viewMode === "month") {
      updateLocation(
        toISODateString(new Date(year, month - 1 + direction, 1)),
        viewMode
      );
      return;
    }
    const next = new Date(year, month - 1, day);
    next.setDate(next.getDate() + direction * (viewMode === "week" ? 7 : 1));
    updateLocation(toISODateString(next), viewMode);
  }

  function openDay(dateKey: string) {
    updateLocation(dateKey, "day");
  }

  function reloadAll() {
    // Làm mới luôn đưa lịch về hôm nay và quay lại trang đầu tiên.
    const today = toISODateString(new Date());
    setPagedPage(1);
    updateLocation(today, viewMode);
    setReloadToken((token) => token + 1);
    setPagedReloadToken((token) => token + 1);
    setRoomsReloadToken((token) => token + 1);
  }

  function changePage(nextPage: number) {
    const lastPage = Math.max(1, pagedTotalPages);
    const clamped = Math.min(Math.max(1, nextPage), lastPage);
    if (clamped === pagedPage) return;
    setPagedPage(clamped);
    window.requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 3. Dữ liệu theo chế độ xem
  const selectedDateSchedules = useMemo(
    () =>
      rangeSchedules.filter(
        (item) => toVietnamDateKey(item.startAt) === selectedDate
      ),
    [rangeSchedules, selectedDate]
  );

  const schedulesByRoom = useMemo(
    () => groupSchedulesByRoom(selectedDateSchedules),
    [selectedDateSchedules]
  );

  const weekSchedulesByRoomDate = useMemo(
    () => groupSchedulesByRoomAndDate(rangeSchedules),
    [rangeSchedules]
  );

  // Ngày đã qua coi như mọi khung giờ đều đã kết thúc; ngày tương lai chưa có
  // khung giờ nào "đang diễn ra".
  const dayCurrentMinutes = isToday ? currentMinutes : isPastDate ? 24 * 60 : 0;

  const suggestedSlot = useMemo(
    () => getSuggestedBookingSlot(selectedDate, todayKey, currentMinutes),
    [selectedDate, todayKey, currentMinutes]
  );

  // 4. Bộ lọc
  const roomTypes = useMemo(() => {
    const values = new Set<string>();
    for (const room of rooms) {
      if (isStudent && !isStudentBookableRoomType(room.roomTypeName)) continue;
      if (room.roomTypeName) values.add(room.roomTypeName);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "vi"));
  }, [rooms, isStudent]);

  const buildings = useMemo(() => {
    const values = new Set<string>();
    for (const room of rooms) {
      if (isStudent && !isStudentBookableRoomType(room.roomTypeName)) continue;
      if (room.building) values.add(room.building);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "vi"));
  }, [rooms, isStudent]);

  const floors = useMemo(() => {
    const values = new Set<string>();
    for (const room of rooms) {
      if (isStudent && !isStudentBookableRoomType(room.roomTypeName)) continue;
      if (room.floor) values.add(room.floor);
    }
    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, "vi", { numeric: true })
    );
  }, [rooms, isStudent]);

  const filteredRooms = useMemo(() => {
    const keyword = filterKeyword.trim().toLowerCase();

    return rooms.filter((room) => {
      if (isStudent && !isStudentBookableRoomType(room.roomTypeName)) {
        return false;
      }
      if (keyword) {
        const haystack = `${room.roomCode ?? ""} ${room.name ?? ""} ${
          room.roomNumber ?? ""
        }`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      if (filterType !== "all" && room.roomTypeName !== filterType) {
        return false;
      }
      if (filterBuilding !== "all" && room.building !== filterBuilding) {
        return false;
      }
      if (filterFloor !== "all" && room.floor !== filterFloor) {
        return false;
      }
      if (filterStatus !== "all") {
        const normalized = normalizeRoomStatus(room.status);
        if (filterStatus === "maintenance") {
          return normalized === "maintenance";
        }
        if (filterStatus === "in-use") {
          if (normalized === "in-use") return true;
          if (viewMode !== "day") return false;
          const badge = getRoomBadgeInfo(
            room,
            schedulesByRoom[room.id] || [],
            dayCurrentMinutes
          );
          return badge.variant === "in-use";
        }
        if (filterStatus === "free") {
          if (normalized === "maintenance" || normalized === "in-use") {
            return false;
          }
          if (viewMode !== "day") return true;
          const badge = getRoomBadgeInfo(
            room,
            schedulesByRoom[room.id] || [],
            dayCurrentMinutes
          );
          return badge.variant === "free";
        }
      }
      return true;
    });
  }, [
    rooms,
    isStudent,
    filterKeyword,
    filterType,
    filterBuilding,
    filterFloor,
    filterStatus,
    viewMode,
    schedulesByRoom,
    dayCurrentMinutes,
  ]);

  // Phòng đang hiển thị: Ngày/Tuần lấy theo trang từ API, Tháng dùng toàn bộ
  // danh mục đã lọc để tính thống kê cho từng ngày.
  const visibleRooms = viewMode === "month" ? filteredRooms : pagedRooms;
  const pagedStart =
    pagedTotalItems === 0 ? 0 : (pagedPage - 1) * pagedPageSize + 1;
  const pagedEnd = Math.min(pagedPage * pagedPageSize, pagedTotalItems);

  // 4b. Khung thời gian hiển thị: mở rộng theo bộ tiết của các loại phòng
  // đang hiển thị để không cắt mất tiết sớm (06:30) hoặc tiết muộn (21:30).
  const periodBoundsByRoomType = useMemo(() => {
    const map = new Map<number, { startMin: number; endMin: number }>();
    for (const period of periods) {
      if (!period.roomTypeId) continue;
      const startMin = timeStringToMinutes(period.startTime);
      const endMin = timeStringToMinutes(period.endTime);
      const current = map.get(period.roomTypeId);
      map.set(period.roomTypeId, {
        startMin: current ? Math.min(current.startMin, startMin) : startMin,
        endMin: current ? Math.max(current.endMin, endMin) : endMin,
      });
    }
    return map;
  }, [periods]);

  const dayWindowDefaults = useMemo(() => {
    let startMin = MATRIX_TIMELINE_START_MIN;
    let endMin = MATRIX_TIMELINE_END_MIN;
    for (const room of filteredRooms) {
      if (!room.isBookingByPeriod || !room.roomTypeId) continue;
      const bounds = periodBoundsByRoomType.get(room.roomTypeId);
      if (!bounds) continue;
      // Làm tròn về đầu giờ để mọi cột thời gian rộng đều nhau.
      startMin = Math.min(startMin, Math.floor(bounds.startMin / 60) * 60);
      endMin = Math.max(endMin, Math.ceil(bounds.endMin / 60) * 60);
    }
    return { startMin, endMin };
  }, [filteredRooms, periodBoundsByRoomType]);

  const timelineWindow = useMemo(
    () =>
      computeTimelineWindow(
        selectedDateSchedules,
        dayWindowDefaults.startMin,
        dayWindowDefaults.endMin
      ),
    [selectedDateSchedules, dayWindowDefaults]
  );

  const timeIndicator = useMemo(
    () =>
      calculateCurrentTimeIndicator(
        dayCurrentMinutes,
        timelineWindow.startMin,
        timelineWindow.durationMin
      ),
    [dayCurrentMinutes, timelineWindow]
  );

  const filteredRoomIds = useMemo(
    () => new Set(visibleRooms.map((room) => room.id)),
    [visibleRooms]
  );

  const totalBookingsInRange = useMemo(
    () =>
      rangeSchedules.filter(
        (item) =>
          isActiveSchedule(item) && filteredRoomIds.has(item.roomId ?? -1)
      ).length,
    [rangeSchedules, filteredRoomIds]
  );

  const dayStats = useMemo(
    () =>
      buildDayStats(
        filteredRooms,
        rangeSchedules,
        monthGrid.map((cell) => cell.dateKey)
      ),
    [filteredRooms, rangeSchedules, monthGrid]
  );

  // 5. Điều hướng đặt phòng
  function getRoomPeriods(room: RoomItem) {
    if (!room.isBookingByPeriod || !room.roomTypeId) return [];
    return periods
      .filter((period) => period.roomTypeId === room.roomTypeId)
      .map((period) => ({
        period,
        startMin: timeStringToMinutes(period.startTime),
        endMin: timeStringToMinutes(period.endTime),
      }))
      .sort((a, b) => a.startMin - b.startMin);
  }

  /**
   * Mỗi loại phòng đặt theo tiết có khung giờ khả dụng riêng (lý thuyết bắt
   * đầu 06:30, thực hành 07:00). Cột lịch dùng khung chung nhưng nội dung
   * trống/hết giờ của từng phòng phải phản ánh đúng bộ tiết của phòng đó.
   */
  function getRoomBookableWindow(room: RoomItem) {
    const roomPeriods = getRoomPeriods(room);
    if (roomPeriods.length === 0) {
      return {
        startMin: timelineWindow.startMin,
        endMin: timelineWindow.endMin,
      };
    }
    return {
      startMin: roomPeriods[0].startMin,
      endMin: roomPeriods[roomPeriods.length - 1].endMin,
    };
  }

  /**
   * Quy đổi khoảng trống thành dải tiết học trọn vẹn. Phòng đặt theo tiết
   * không nhận khung giờ tự do, nên chỉ chọn được khi có ít nhất một tiết
   * nằm trọn trong khoảng trống.
   */
  function findPeriodRange(room: RoomItem, startMin: number, endMin: number) {
    const options = getRoomPeriods(room).filter(
      (item) => item.startMin >= startMin && item.endMin <= endMin
    );
    if (options.length === 0) return null;
    return {
      startPeriodId: options[0].period.id,
      endPeriodId: options[options.length - 1].period.id,
    };
  }

  function goToBooking(room: RoomItem, startMin: number, endMin: number) {
    const params = new URLSearchParams({
      roomId: String(room.id),
      date: selectedDate,
    });

    const periodRange = findPeriodRange(room, startMin, endMin);
    if (periodRange) {
      params.set("startPeriodId", String(periodRange.startPeriodId));
      params.set("endPeriodId", String(periodRange.endPeriodId));
    } else {
      params.set("startTime", `${minutesToTimeString(startMin)}:00`);
      params.set("endTime", `${minutesToTimeString(endMin)}:00`);
    }

    navigate(`/dat-phong?${params.toString()}`);
  }

  /**
   * Khung giờ có thể đặt cho một khoảng trống. Trả về null khi khoảng trống
   * đã qua, phòng bảo trì, hoặc không còn tiết/khung giờ hợp lệ.
   */
  function getBookableGap(
    segment: TimelineSegment,
    room: RoomItem,
    roomMaintenance: boolean
  ): { startMin: number; endMin: number } | null {
    if (roomMaintenance || isPastDate) return null;

    let startMin = Math.max(timelineWindow.startMin, segment.startMinutes);
    if (isToday) {
      const nextQuarter = Math.ceil((currentMinutes + 1) / 15) * 15;
      startMin = Math.max(startMin, nextQuarter);
    }

    let endMin = segment.endMinutes;
    if (room.isBookingByPeriod) {
      endMin = Math.min(endMin, timelineWindow.endMin);
      if (!findPeriodRange(room, startMin, endMin)) return null;
    } else {
      endMin = Math.min(endMin, MATRIX_TIMELINE_END_MIN, startMin + 120);
    }
    if (startMin >= endMin) return null;

    return { startMin, endMin };
  }

  /**
   * Gợi ý 2 tiết đầu tiên còn trống trong hôm nay (hoặc 2 tiết đầu ngày
   * tương lai) cho phòng đặt theo tiết; phòng theo giờ dùng khung 2 giờ.
   */
  function getQuickDayBooking(
    room: RoomItem
  ): { startMin: number; endMin: number } | null {
    const periodOptions = getRoomPeriods(room);
    if (periodOptions.length > 0) {
      const available = periodOptions.filter(
        (item) => !isToday || item.startMin > currentMinutes
      );
      if (available.length === 0) return null;
      const first = available[0];
      const second = available[1] ?? first;
      return { startMin: first.startMin, endMin: second.endMin };
    }

    if (!suggestedSlot) return null;
    return {
      startMin: timeStringToMinutes(suggestedSlot.start),
      endMin: timeStringToMinutes(suggestedSlot.end),
    };
  }

  // Đóng popup chi tiết bằng phím Esc
  useEffect(() => {
    if (!detailSelection) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailSelection(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailSelection]);

  const detailBooking = detailSelection?.segment.booking;
  const detailBadge = detailBooking
    ? getScheduleStatusBadge(detailBooking.status)
    : null;

  return (
    <div className="schedule-matrix-page">
      <main className="schedule-matrix-main">
        <div className="matrix-content-wrapper">
          {/* Tiêu đề và điều hướng ngày */}
          <section className="matrix-hero-bar">
            <div className="hero-bar-left">
              <h1 className="hero-page-title">Lịch sử dụng phòng</h1>
            </div>

            <div className="hero-bar-right">
              <div className="date-nav-pill">
                <button
                  type="button"
                  className="date-nav-arrow"
                  onClick={() => shiftDate(-1)}
                  title={viewMode === "week" ? "Tuần trước" : "Trước"}
                  aria-label={viewMode === "week" ? "Tuần trước" : "Trước"}
                >
                  <ChevronLeftIcon size={16} />
                </button>

                <div className="date-label-clickable">
                  <CalendarIcon size={16} className="date-icon" />
                  <span className="date-label-text">
                    {isToday ? "Hôm nay: " : ""}
                    {formatVietnameseDate(selectedDate)}
                  </span>
                  <input
                    type="date"
                    className="date-native-picker"
                    value={selectedDate}
                    onChange={(event) => {
                      if (event.target.value) {
                        handleDateChange(event.target.value);
                      }
                    }}
                    title="Chọn ngày"
                  />
                </div>

                <button
                  type="button"
                  className="date-nav-arrow"
                  onClick={() => shiftDate(1)}
                  title={viewMode === "week" ? "Tuần sau" : "Sau"}
                  aria-label={viewMode === "week" ? "Tuần sau" : "Sau"}
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>

              <div className="view-mode-segmented">
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "day" ? "active" : ""}`}
                  onClick={() => handleViewChange("day")}
                >
                  Ngày
                </button>
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "week" ? "active" : ""}`}
                  onClick={() => handleViewChange("week")}
                >
                  Tuần
                </button>
                <button
                  type="button"
                  className={`segment-btn ${viewMode === "month" ? "active" : ""}`}
                  onClick={() => handleViewChange("month")}
                >
                  Tháng
                </button>
              </div>

              <button
                type="button"
                className={`refresh-matrix-btn ${schedulesLoading ? "is-loading" : ""}`}
                onClick={reloadAll}
                title="Làm mới lịch"
                aria-label="Làm mới lịch"
                disabled={schedulesLoading}
              >
                <RefreshCwIcon size={16} />
              </button>

              {lastUpdated && (
                <span className="matrix-updated-label">
                  Cập nhật{" "}
                  {minutesToTimeString(
                    lastUpdated.getHours() * 60 + lastUpdated.getMinutes()
                  )}
                </span>
              )}
            </div>
          </section>

          {/* Bộ lọc */}
          <section className="matrix-control-row">
            <div className="matrix-filters-group">
              <div className="control-item control-search">
                <label htmlFor="filter-keyword">TÌM PHÒNG:</label>
                <div className="select-wrapper">
                  <input
                    id="filter-keyword"
                    type="search"
                    placeholder="Mã hoặc tên phòng..."
                    value={filterKeyword}
                    onChange={(event) => {
                      setFilterKeyword(event.target.value);
                      setPagedPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-room-type">LOẠI PHÒNG:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-room-type"
                    value={filterType}
                    onChange={(event) => {
                      setFilterType(event.target.value);
                      setPagedPage(1);
                    }}
                  >
                    <option value="all">Tất cả loại phòng</option>
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-building">TÒA:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-building"
                    value={filterBuilding}
                    onChange={(event) => {
                      setFilterBuilding(event.target.value);
                      setPagedPage(1);
                    }}
                  >
                    <option value="all">Tất cả tòa</option>
                    {buildings.map((building) => (
                      <option key={building} value={building}>
                        {building}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-floor">TẦNG:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-floor"
                    value={filterFloor}
                    onChange={(event) => {
                      setFilterFloor(event.target.value);
                      setPagedPage(1);
                    }}
                  >
                    <option value="all">Tất cả tầng</option>
                    {floors.map((floor) => (
                      <option key={floor} value={floor}>
                        {floor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="control-item">
                <label htmlFor="filter-status">TRẠNG THÁI:</label>
                <div className="select-wrapper">
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(event) => {
                      setFilterStatus(event.target.value);
                      setPagedPage(1);
                    }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="free">Còn trống</option>
                    <option value="in-use">Đang sử dụng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
              </div>
            </div>

            {viewMode === "day" && (
              <div className="matrix-legends">
                <div className="legend-entry">
                  <span className="legend-box dashed-free"></span>
                  <span>Còn trống</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-box solid-booked"></span>
                  <span>Đã đặt trước</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-box solid-in-use"></span>
                  <span>Đang sử dụng</span>
                </div>
                <div className="legend-entry">
                  <span className="legend-box solid-maintenance"></span>
                  <span>Bảo trì</span>
                </div>
                {isToday && timeIndicator.isVisible && (
                  <div className="legend-entry">
                    <span className="legend-line-current"></span>
                    <span>Hiện tại ({timeIndicator.timeLabel})</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {roomsError && (
            <div className="matrix-alert error">
              <InfoIcon size={18} />
              <span>Không tải được danh mục phòng. {roomsError}</span>
              <button
                type="button"
                onClick={() => setRoomsReloadToken((token) => token + 1)}
              >
                Thử lại
              </button>
            </div>
          )}

          {schedulesError && (
            <div className="matrix-alert error">
              <InfoIcon size={18} />
              <span>Không tải được lịch phòng. {schedulesError}</span>
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                Thử lại
              </button>
            </div>
          )}

          {viewMode !== "month" && pagedError && (
            <div className="matrix-alert error">
              <InfoIcon size={18} />
              <span>Không tải được danh mục phòng. {pagedError}</span>
              <button
                type="button"
                onClick={() => setPagedReloadToken((token) => token + 1)}
              >
                Thử lại
              </button>
            </div>
          )}

          <div ref={listTopRef} className="matrix-list-anchor" />

          {!viewsBlocked && viewMode !== "day" && (
            <div className="range-summary">
              <span>
                <strong>
                  {viewMode === "week"
                    ? `Tuần ${formatShortDate(weekDays[0])} - ${formatShortDate(
                        weekDays[weekDays.length - 1]
                      )}`
                    : `Tháng ${Number(selectedDate.slice(5, 7))}/${selectedDate.slice(
                        0,
                        4
                      )}`}
                </strong>
              </span>
              <span>
                <strong>{totalBookingsInRange}</strong> lượt đặt
              </span>
              <span>
                <strong>{visibleRooms.length}</strong> phòng đang hiển thị
              </span>
            </div>
          )}

          {/* Chế độ Ngày */}
          {!viewsBlocked && viewMode === "day" && (
            <div className="matrix-table-container">
              <div className="matrix-table">
                <div className="matrix-header-row">
                  <div className="matrix-cell-corner">
                    <span className="corner-title">KHU VỰC PHÒNG</span>
                    <span className="corner-sub">
                      {pagedTotalItems} phòng
                    </span>
                  </div>

                  <div
                    className="matrix-header-timeline"
                    style={{
                      gridTemplateColumns: `repeat(${timelineWindow.columns.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {timelineWindow.columns.map((column) => (
                      <div
                        key={column.startMin}
                        className="timeline-header-slot"
                      >
                        {column.label}
                      </div>
                    ))}
                  </div>
                </div>

                {pagedLoading || isRangeLoading ? (
                  <div className="matrix-loading-placeholder">
                    <div className="spinner"></div>
                    <span>Đang tải lịch phòng...</span>
                  </div>
                ) : pagedRooms.length === 0 ? (
                  <div className="matrix-empty-row">
                    Không tìm thấy phòng nào phù hợp với bộ lọc đã chọn.
                  </div>
                ) : (
                  pagedRooms.map((room, roomIndex) => {
                    const roomSchedules = schedulesByRoom[room.id] || [];
                    const badgeInfo = getRoomBadgeInfo(
                      room,
                      roomSchedules,
                      dayCurrentMinutes
                    );
                    const amenities = parseRoomAmenities(room);
                    const roomMaintenance =
                      normalizeRoomStatus(room.status) === "maintenance";
                    const roomWindow = getRoomBookableWindow(room);
                    const segments = buildRoomTimelineSegments(
                      room,
                      roomSchedules,
                      dayCurrentMinutes,
                      timelineWindow.startMin,
                      timelineWindow.endMin,
                      roomWindow.startMin,
                      roomWindow.endMin
                    );

                    return (
                      <div key={room.id} className="matrix-body-row">
                        <div className="room-info-cell">
                          <div className="room-cell-top">
                            <h3 className="room-display-name">{room.name}</h3>
                            <span
                              className={`room-badge-tag badge-${badgeInfo.variant}`}
                            >
                              {badgeInfo.text}
                            </span>
                          </div>

                          <div className="room-cell-location">
                            {room.roomCode} • {room.roomTypeName || "Phòng học"} •{" "}
                            {room.building ? `Tòa ${room.building}` : "Chưa rõ tòa"} •
                            Tầng {room.floor || "—"} • {room.capacity} chỗ
                          </div>

                          <div className="room-cell-amenities">
                            {amenities
                              .filter((item) => item.iconType !== "users")
                              .map((item, index) => (
                                <span key={index} className="amenity-chip">
                                  {item.iconType === "tv" && <span>🖥</span>}
                                  {item.iconType === "plug" && <span>🔌</span>}
                                  {item.iconType === "wifi" && <span>📶</span>}
                                  {item.iconType === "board" && <span>📋</span>}
                                  {item.iconType === "mic" && <span>🎙</span>}
                                  {item.iconType === "speaker" && <span>📢</span>}
                                  <span>{item.label}</span>
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="room-timeline-cell">
                          <div
                            className="timeline-background-grid"
                            style={{
                              gridTemplateColumns: `repeat(${timelineWindow.columns.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {timelineWindow.columns.map((column) => (
                              <div
                                key={column.startMin}
                                className="timeline-grid-col"
                              ></div>
                            ))}
                          </div>

                          {isToday && timeIndicator.isVisible && (
                            <div
                              className="current-time-vertical-line"
                              style={{
                                left: `${timeIndicator.leftPercent}%`,
                              }}
                            >
                              {roomIndex === 0 && (
                                <div className="current-time-flag">
                                  {timeIndicator.timeLabel} HIỆN TẠI
                                </div>
                              )}
                            </div>
                          )}

                          <div className="timeline-segments-layer">
                            {segments.map((segment) => {
                              const segmentStyle = {
                                left: `${segment.leftPercent}%`,
                                width: `${segment.widthPercent}%`,
                              };

                              if (segment.type === "full-free") {
                                // Cả ngày trống → dải CTA phủ trọn khung timeline
                                // để không lệch với lưới giờ dùng chung. Khi hôm
                                // nay đã trôi qua một phần, dải xanh chỉ bắt đầu
                                // từ vạch giờ hiện tại.
                                const fullFreeStyle = {
                                  left: `${
                                    segment.startMinutes <= roomWindow.startMin
                                      ? 0
                                      : segment.leftPercent
                                  }%`,
                                  width: `${
                                    segment.startMinutes <= roomWindow.startMin
                                      ? 100
                                      : 100 - segment.leftPercent
                                  }%`,
                                };
                                const quickDay = roomMaintenance || isPastDate
                                  ? null
                                  : getQuickDayBooking(room);

                                if (quickDay) {
                                  const quickStart = minutesToTimeString(
                                    quickDay.startMin
                                  );
                                  const quickEnd = minutesToTimeString(
                                    quickDay.endMin
                                  );
                                  const bookFullDay = () =>
                                    goToBooking(
                                      room,
                                      quickDay.startMin,
                                      quickDay.endMin
                                    );
                                  return (
                                    <div
                                      key={segment.id}
                                      role="button"
                                      tabIndex={0}
                                      className="segment-card segment-full-free"
                                      style={fullFreeStyle}
                                      onClick={bookFullDay}
                                      onKeyDown={keyboardActivate(
                                        bookFullDay
                                      )}
                                      title={`Đặt phòng ${quickStart} - ${quickEnd}`}
                                    >
                                      <div className="full-free-content">
                                        <div className="full-free-icon">
                                          <CalendarIcon size={18} />
                                        </div>
                                        <div className="full-free-text">
                                          <div className="full-free-sub">
                                            {segment.subtitle}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="btn-full-free-action">
                                        {segment.actionText}
                                      </span>
                                    </div>
                                  );
                                }

                                const staticSubtitle = isPastDate
                                  ? "Ngày đã qua"
                                  : roomMaintenance
                                    ? "Phòng đang bảo trì"
                                    : "Đã hết giờ đặt trong hôm nay";
                                return (
                                  <div
                                    key={segment.id}
                                    className="segment-card segment-full-free is-static"
                                    style={fullFreeStyle}
                                  >
                                    <div className="full-free-content">
                                      <div className="full-free-icon">
                                        <CalendarIcon size={18} />
                                      </div>
                                      <div className="full-free-text">
                                        <div className="full-free-sub">
                                          {staticSubtitle}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              if (segment.type === "past") {
                                // Dải "đã qua" của phòng trống cả ngày kéo từ
                                // mép khung tới vạch giờ hiện tại để khớp với
                                // dải xanh phía sau.
                                const pastStyle = segment.id.startsWith(
                                  "full-free-past"
                                )
                                  ? {
                                      left: "0%",
                                      width: `${
                                        segment.leftPercent +
                                        segment.widthPercent
                                      }%`,
                                    }
                                  : segmentStyle;
                                return (
                                  <div
                                    key={segment.id}
                                    className="segment-card segment-past is-static"
                                    style={pastStyle}
                                  ></div>
                                );
                              }

                              if (segment.type === "free") {
                                const gap = getBookableGap(
                                  segment,
                                  room,
                                  roomMaintenance
                                );

                                if (!gap) {
                                  return (
                                    <div
                                      key={segment.id}
                                      className="segment-card segment-past is-static"
                                      style={segmentStyle}
                                    >
                                      {roomMaintenance && (
                                        <span className="past-text">
                                          Bảo trì: {segment.startTimeStr} -{" "}
                                          {segment.endTimeStr}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }

                                const gapStart = minutesToTimeString(
                                  gap.startMin
                                );
                                const gapEnd = minutesToTimeString(
                                  gap.endMin
                                );
                                const bookGap = () =>
                                  goToBooking(room, gap.startMin, gap.endMin);
                                return (
                                  <div
                                    key={segment.id}
                                    role="button"
                                    tabIndex={0}
                                    className="segment-card segment-free"
                                    style={segmentStyle}
                                    onClick={bookGap}
                                    onKeyDown={keyboardActivate(bookGap)}
                                    title={`Đặt phòng ${gapStart} - ${gapEnd}`}
                                  >
                                    <span className="free-segment-text">
                                      Nhấp để đặt phòng
                                    </span>
                                  </div>
                                );
                              }

                              const openDetail = () =>
                                setDetailSelection({ room, segment });

                              return (
                                <div
                                  key={segment.id}
                                  role="button"
                                  tabIndex={0}
                                  className={`segment-card segment-${segment.type} ${
                                    segment.isPending ? "is-pending" : ""
                                  }`}
                                  style={segmentStyle}
                                  onClick={openDetail}
                                  onKeyDown={keyboardActivate(openDetail)}
                                  title={`${segment.title || "Lịch đặt phòng"} (${segment.startTimeStr} - ${segment.endTimeStr})`}
                                >
                                  <div className="card-top-row">
                                    <span className="card-time-span">
                                      {segment.type === "in-use" && (
                                        <span className="card-live-dot">●</span>
                                      )}
                                      {segment.type === "conference" && (
                                        <span className="card-speaker-icon">
                                          📢
                                        </span>
                                      )}
                                      {segment.startTimeStr} -{" "}
                                      {segment.endTimeStr}
                                    </span>
                                    {segment.badgeText && (
                                      <span
                                        className={`card-status-badge ${segment.type}`}
                                      >
                                        {segment.badgeText}
                                      </span>
                                    )}
                                  </div>

                                  <div className="card-activity-name">
                                    {segment.title}
                                  </div>

                                  {segment.subtitle && (
                                    <div className="card-sub-info">
                                      {segment.subtitle}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Chế độ Tuần */}
          {!viewsBlocked && viewMode === "week" && (
            <div className="range-view">
              {pagedLoading || isRangeLoading ? (
                <div className="matrix-loading-placeholder">
                  <div className="spinner"></div>
                  <span>Đang tải lịch tuần...</span>
                </div>
              ) : pagedRooms.length === 0 ? (
                <div className="matrix-empty-row">
                  Không tìm thấy phòng nào phù hợp với bộ lọc đã chọn.
                </div>
              ) : (
                <div className="week-grid">
                  <div className="week-header-row">
                    <div className="week-header-cell is-room">PHÒNG</div>
                    {weekDays.map((dateKey) => (
                      <div
                        key={dateKey}
                        className={`week-header-cell ${
                          dateKey === todayKey ? "is-today" : ""
                        }`}
                      >
                        {formatShortDate(dateKey)}
                      </div>
                    ))}
                  </div>

                  {pagedRooms.map((room) => {
                    const roomMaintenance =
                      normalizeRoomStatus(room.status) === "maintenance";

                    return (
                      <div key={room.id} className="week-body-row">
                        <div className="week-room-cell">
                          <span className="week-room-name">{room.name}</span>
                          <span className="week-room-meta">
                            {room.roomCode} • {room.floor || "Chưa rõ tầng"}
                          </span>
                        </div>

                        {weekDays.map((dateKey) => {
                          const items = (
                            weekSchedulesByRoomDate[`${room.id}|${dateKey}`] ?? []
                          ).filter(isActiveSchedule);
                          const isPastDay = dateKey < todayKey;

                          const startMin =
                            items.length > 0
                              ? Math.min(
                                  ...items.map((item) =>
                                    parseVietnamTimeMinutes(item.startAt)
                                  )
                                )
                              : 0;
                          const endMin =
                            items.length > 0
                              ? Math.max(
                                  ...items.map((item) =>
                                    parseVietnamTimeMinutes(item.endAt)
                                  )
                                )
                              : 0;

                          let cellClass = "is-free";
                          if (roomMaintenance) cellClass = "is-maintenance";
                          else if (items.length > 0) cellClass = "is-busy";

                          return (
                            <div key={dateKey} className="week-day-cell">
                              <button
                                type="button"
                                className={`week-day-btn ${cellClass} ${
                                  isPastDay ? "is-past" : ""
                                }`}
                                onClick={() => openDay(dateKey)}
                                title={`Xem ngày ${formatVietnameseDate(dateKey)}`}
                              >
                                {roomMaintenance ? (
                                  <span className="week-day-note">Bảo trì</span>
                                ) : items.length === 0 ? (
                                  <span className="week-day-note">Trống</span>
                                ) : (
                                  <>
                                    <span className="week-day-count">
                                      {items.length} lượt
                                    </span>
                                    <span className="week-day-note">
                                      {minutesToTimeString(startMin)} -{" "}
                                      {minutesToTimeString(endMin)}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chế độ Tháng */}
          {!viewsBlocked && viewMode === "month" && (
            <div className="range-view">
              {roomsLoading || isRangeLoading ? (
                <div className="matrix-loading-placeholder">
                  <div className="spinner"></div>
                  <span>Đang tải lịch tháng...</span>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="matrix-empty-row">
                  Không tìm thấy phòng nào phù hợp với bộ lọc đã chọn.
                </div>
              ) : (
                <>
                  <div className="month-weekdays">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                      <div key={day} className="month-weekday">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="month-grid">
                    {monthGrid.map((cell) => {
                      const stat = dayStats[cell.dateKey];
                      const isPastDay = cell.dateKey < todayKey;
                      const classNames = ["month-cell"];
                      if (!cell.inMonth) classNames.push("is-outside");
                      if (cell.dateKey === todayKey) classNames.push("is-today");

                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          className={classNames.join(" ")}
                          onClick={() => openDay(cell.dateKey)}
                          title={`Xem ngày ${formatVietnameseDate(cell.dateKey)}`}
                        >
                          <span className="month-day-number">
                            {Number(cell.dateKey.slice(8))}
                          </span>
                          {cell.inMonth && stat && stat.totalRooms > 0 && (
                            <span className="month-day-meta">
                              <strong>{stat.bookingCount}</strong> lượt đặt
                              <br />
                              {stat.freeRoomCount}/{stat.totalRooms} phòng trống
                              {isPastDay ? " • Đã qua" : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {!viewsBlocked && viewMode !== "month" && pagedTotalItems > 0 && (
            <nav className="matrix-pagination" aria-label="Phân trang danh sách phòng">
              <span className="pagination-summary">
                Hiển thị <strong>{pagedStart}–{pagedEnd}</strong> trong{" "}
                <strong>{pagedTotalItems}</strong> phòng
              </span>

              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => changePage(1)}
                  disabled={pagedPage <= 1}
                  aria-label="Trang đầu"
                >
                  Đầu
                </button>
                <button
                  type="button"
                  onClick={() => changePage(pagedPage - 1)}
                  disabled={pagedPage <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon size={15} />
                </button>

                {buildPageItems(pagedPage, pagedTotalPages).map((item, index) =>
                  item === "gap" ? (
                    <span key={`gap-${index}`} className="pagination-gap">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={item === pagedPage ? "is-active" : ""}
                      onClick={() => changePage(item)}
                      aria-current={item === pagedPage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => changePage(pagedPage + 1)}
                  disabled={pagedPage >= pagedTotalPages}
                  aria-label="Trang sau"
                >
                  <ChevronRightIcon size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => changePage(pagedTotalPages)}
                  disabled={pagedPage >= pagedTotalPages}
                  aria-label="Trang cuối"
                >
                  Cuối
                </button>
              </div>

              <label className="pagination-size">
                <span>Số phòng/trang</span>
                <select
                  value={pagedPageSize}
                  onChange={(event) => {
                    setPagedPageSize(Number(event.target.value));
                    setPagedPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </nav>
          )}
        </div>
      </main>

      {detailSelection && (
        <div
          className="schedule-detail-overlay"
          role="presentation"
          onClick={() => setDetailSelection(null)}
        >
          <div
            className="schedule-detail-card"
            role="dialog"
            aria-modal="true"
            aria-label="Chi tiết lịch đặt phòng"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="schedule-detail-header">
              <div>
                <h3>{detailSelection.segment.title || "Lịch đặt phòng"}</h3>
                <p>
                  {detailSelection.room.name} •{" "}
                  {detailSelection.room.floor || "Chưa rõ tầng"}
                </p>
              </div>
              <button
                type="button"
                className="schedule-detail-close"
                onClick={() => setDetailSelection(null)}
                aria-label="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="schedule-detail-body">
              <div className="schedule-detail-row">
                <span>Thời gian</span>
                <strong>
                  {detailSelection.segment.startTimeStr} -{" "}
                  {detailSelection.segment.endTimeStr}
                </strong>
              </div>
              <div className="schedule-detail-row">
                <span>Ngày</span>
                <span>{formatVietnameseDate(selectedDate)}</span>
              </div>
              {detailBooking?.startPeriodName && (
                <div className="schedule-detail-row">
                  <span>Tiết học</span>
                  <span>
                    {detailBooking.startPeriodName}
                    {detailBooking.endPeriodName &&
                    detailBooking.endPeriodName !== detailBooking.startPeriodName
                      ? ` – ${detailBooking.endPeriodName}`
                      : ""}
                  </span>
                </div>
              )}
              <div className="schedule-detail-row">
                <span>Phòng</span>
                <span>
                  {detailSelection.room.name} ({detailSelection.room.roomCode})
                </span>
              </div>
              <div className="schedule-detail-row">
                <span>Người đặt</span>
                <span>{detailBooking?.bookedByName || "Không có thông tin"}</span>
              </div>
              <div className="schedule-detail-row">
                <span>Số người</span>
                <span>{detailBooking?.guestCount ?? 0} người</span>
              </div>
              <div className="schedule-detail-row">
                <span>Mục đích</span>
                <span>{detailBooking?.purpose || "—"}</span>
              </div>
              <div className="schedule-detail-row">
                <span>Trạng thái</span>
                {detailBadge && (
                  <span
                    className={`schedule-detail-badge ${detailBadge.cssClass}`}
                  >
                    {detailBadge.label}
                  </span>
                )}
              </div>
            </div>

            <div className="schedule-detail-footer">
              <button type="button" onClick={() => setDetailSelection(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
