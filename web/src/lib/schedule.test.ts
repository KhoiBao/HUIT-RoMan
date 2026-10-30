import { describe, it, expect } from "vitest";
import {
  toISODateString,
  formatVietnameseDate,
  timeStringToMinutes,
  buildPeriodSlots,
  buildHourlySlots,
  getScheduleStatusBadge,
  parseVietnamTimeMinutes,
  minutesToTimeString,
  calculateTimelinePosition,
  calculateCurrentTimeIndicator,
  buildRoomTimelineSegments,
  buildTimelineColumns,
  computeTimelineWindow,
  getRoomBadgeInfo,
  normalizeRoomStatus,
  parseRoomAmenities,
  computeMatrixKpis,
  getWeekDays,
  getMonthGrid,
  buildDayStats,
  groupSchedulesByRoom,
  groupSchedulesByRoomAndDate,
  toVietnamDateKey,
  getSuggestedBookingSlot,
  formatPeriodLabel,
  type Period,
  type RoomScheduleItem,
} from "./schedule";

describe("schedule pure functions", () => {
  it("formatPeriodLabel prints one start-end range per period", () => {
    // Nhãn dùng chung cho cả ô tiết bắt đầu và tiết kết thúc: cùng một tiết
    // phải in đúng cặp giờ của nó, không phụ thuộc ô đang hiển thị.
    const theoryPeriod: Period = {
      id: 10,
      name: "Tiết 10",
      startTime: "15:30:00",
      endTime: "16:20:00",
      roomTypeId: 4,
    };
    expect(formatPeriodLabel(theoryPeriod)).toBe("Tiết 10 (15:30 - 16:20)");

    const practicePeriod: Period = {
      id: 26,
      name: "Tiết 10",
      startTime: "15:00:00",
      endTime: "15:50:00",
      roomTypeId: 5,
    };
    expect(formatPeriodLabel(practicePeriod)).toBe("Tiết 10 (15:00 - 15:50)");
  });

  it("toISODateString formats properly", () => {
    const d = new Date(2026, 9, 15); // Month is 0-indexed, 9 = October
    expect(toISODateString(d)).toBe("2026-10-15");
  });

  it("formatVietnameseDate formats to readable Vietnamese", () => {
    const formatted = formatVietnameseDate("2026-10-15");
    expect(formatted).toContain("15/10/2026");
    expect(formatted).toContain("Thứ Năm");
  });

  it("timeStringToMinutes converts string to minutes correctly", () => {
    expect(timeStringToMinutes("06:30:00")).toBe(390);
    expect(timeStringToMinutes("12:00")).toBe(720);
    expect(timeStringToMinutes("")).toBe(0);
  });

  it("buildPeriodSlots correctly marks booked periods by periodId", () => {
    const periods: Period[] = [
      { id: 1, name: "Tiết 1", startTime: "06:30:00", endTime: "07:20:00" },
      { id: 2, name: "Tiết 2", startTime: "07:20:00", endTime: "08:10:00" },
      { id: 3, name: "Tiết 3", startTime: "08:15:00", endTime: "09:05:00" },
    ];

    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 101,
        bookingId: 1,
        activityName: "Thực hành Lập trình Web",
        purpose: "Dạy học chính khóa",
        startAt: "2026-10-15T06:30:00Z",
        endAt: "2026-10-15T08:10:00Z",
        startPeriodId: 1,
        endPeriodId: 2,
        guestCount: 40,
        status: "Đã duyệt",
        bookedByName: "gv001@huit.edu.vn",
      },
    ];

    const slots = buildPeriodSlots(periods, schedules);
    expect(slots).toHaveLength(3);
    expect(slots[0].isBooked).toBe(true);
    expect(slots[0].booking?.activityName).toBe("Thực hành Lập trình Web");
    expect(slots[1].isBooked).toBe(true);
    expect(slots[2].isBooked).toBe(false);
  });

  it("buildPeriodSlots ignores rejected or cancelled bookings", () => {
    const periods: Period[] = [
      { id: 1, name: "Tiết 1", startTime: "06:30:00", endTime: "07:20:00" },
    ];

    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 102,
        bookingId: 2,
        activityName: "Buổi sinh hoạt",
        purpose: "Hội họp",
        startAt: "2026-10-15T06:30:00Z",
        endAt: "2026-10-15T07:20:00Z",
        startPeriodId: 1,
        endPeriodId: 1,
        guestCount: 15,
        status: "Từ chối",
      },
    ];

    const slots = buildPeriodSlots(periods, schedules);
    expect(slots[0].isBooked).toBe(false);
  });

  it("buildHourlySlots generates slots and maps booking intervals", () => {
    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 103,
        bookingId: 3,
        activityName: "Hội thảo Công nghệ",
        purpose: "Sinh hoạt chuyên đề",
        startAt: "2026-10-15T08:00:00",
        endAt: "2026-10-15T10:00:00",
        guestCount: 120,
        status: "Đã duyệt",
      },
    ];

    const slots = buildHourlySlots(schedules, 7, 12);
    expect(slots).toHaveLength(5); // 7, 8, 9, 10, 11
    expect(slots[0].hour).toBe(7);
    expect(slots[0].isBooked).toBe(false);
    expect(slots[1].hour).toBe(8);
    expect(slots[1].isBooked).toBe(true);
    expect(slots[2].hour).toBe(9);
    expect(slots[2].isBooked).toBe(true);
    expect(slots[3].hour).toBe(10);
    expect(slots[3].isBooked).toBe(false);
  });

  it("getScheduleStatusBadge returns correct css classes", () => {
    expect(getScheduleStatusBadge("Đã duyệt").cssClass).toBe("badge-approved");
    expect(getScheduleStatusBadge("Chờ duyệt").cssClass).toBe("badge-pending");
    expect(getScheduleStatusBadge("Từ chối").cssClass).toBe("badge-rejected");
    expect(getScheduleStatusBadge("Đã hủy").cssClass).toBe("badge-cancelled");
  });

  it("parseVietnamTimeMinutes correctly extracts Vietnam time minutes", () => {
    // 01:00 UTC = 08:00 UTC+7 = 480 min
    expect(parseVietnamTimeMinutes("2026-10-14T01:00:00Z")).toBe(480);
    // 03:30 UTC = 10:30 UTC+7 = 630 min
    expect(parseVietnamTimeMinutes("2026-10-14T03:30:00Z")).toBe(630);
    // Pure time string
    expect(parseVietnamTimeMinutes("09:45")).toBe(585);
  });

  it("minutesToTimeString formats to HH:mm string", () => {
    expect(minutesToTimeString(480)).toBe("08:00");
    expect(minutesToTimeString(585)).toBe("09:45");
    expect(minutesToTimeString(1170)).toBe("19:30");
  });

  it("calculateTimelinePosition computes relative percentages", () => {
    // Khung mặc định 07:00 - 20:00 (420 - 1200), dài 780 phút.
    const full = calculateTimelinePosition(420, 1200);
    expect(full.leftPercent).toBe(0);
    expect(full.widthPercent).toBe(100);

    // 08:00 (480) to 10:00 (600): left (60/780)*100 = 7.692%, width (120/780)*100 = 15.385%
    const slot = calculateTimelinePosition(480, 600);
    expect(slot.leftPercent).toBeCloseTo(7.692, 2);
    expect(slot.widthPercent).toBeCloseTo(15.385, 2);
  });

  it("calculateCurrentTimeIndicator detects visibility and position", () => {
    // 09:45 is 585 min -> inside 420 - 1200; left (165/780)*100 = 21.154%
    const ind = calculateCurrentTimeIndicator(585);
    expect(ind.isVisible).toBe(true);
    expect(ind.timeLabel).toBe("09:45");
    expect(ind.leftPercent).toBeCloseTo(21.154, 2);

    // 05:00 is 300 min -> outside
    const early = calculateCurrentTimeIndicator(300);
    expect(early.isVisible).toBe(false);

    // 21:00 is 1260 min -> outside
    const late = calculateCurrentTimeIndicator(1260);
    expect(late.isVisible).toBe(false);
  });

  it("buildRoomTimelineSegments splits today's free day at the current time", () => {
    const room = {
      id: 9,
      name: "Phòng A103",
      roomCode: "A103",
      capacity: 5,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    // 09:45 (585) → 07:00 - 09:45 đã qua, phần còn lại mới bấm được.
    const segments = buildRoomTimelineSegments(room, []);
    expect(segments).toHaveLength(2);

    const [past, future] = segments;
    expect(past.type).toBe("past");
    expect(past.startMinutes).toBe(420);
    expect(past.endMinutes).toBe(585);
    expect(past.title).toBe("Đã qua: 07:00 - 09:45");
    expect(past).not.toHaveProperty("actionText");

    expect(future.type).toBe("full-free");
    expect(future.startMinutes).toBe(585);
    expect(future.endMinutes).toBe(1200);
    expect(future.title).toBe("Trống cả ngày (07:00 - 20:00)");
    expect(future).not.toHaveProperty("actionText");
    expect(future.widthPercent).toBeCloseTo(78.846, 2);
  });

  it("buildRoomTimelineSegments keeps a whole future free day as one clickable block", () => {
    const room = {
      id: 9,
      name: "Phòng A103",
      roomCode: "A103",
      capacity: 5,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const segments = buildRoomTimelineSegments(room, [], 0);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("full-free");
    expect(segments[0].widthPercent).toBe(100);
    expect(segments[0]).not.toHaveProperty("actionText");
  });

  it("buildRoomTimelineSegments clips free time to the room bookable window", () => {
    const practiceRoom = {
      id: 10,
      name: "Phòng Thực hành A101",
      roomCode: "A101",
      capacity: 40,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: true,
    };
    const segments = buildRoomTimelineSegments(
      practiceRoom,
      [],
      0, // ngày tương lai: chưa có phần nào đã qua
      390, // 06:30 global timeline start
      1290, // 21:30 global timeline end
      420, // 07:00 first practice period
      1280 // 21:20 last practice period
    );
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("full-free");
    expect(segments[0].startMinutes).toBe(420);
    expect(segments[0].endMinutes).toBe(1280);
    expect(segments[0].title).toBe("Trống cả ngày (07:00 - 21:20)");
  });

  it("buildRoomTimelineSegments splits a gap that straddles the current time", () => {
    const room = {
      id: 11,
      name: "Phòng A104",
      roomCode: "A104",
      capacity: 7,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 2,
        bookingId: 2,
        activityName: "Sinh hoạt lớp",
        purpose: "CVHT",
        startAt: "2026-10-14T06:00:00Z", // 13:00 UTC+7
        endAt: "2026-10-14T08:00:00Z",   // 15:00 UTC+7
        guestCount: 5,
        status: "Đã duyệt",
      },
    ];

    // 09:45 → khoảng 07:00 - 13:00 bị cắt đôi tại vạch giờ hiện tại.
    const segments = buildRoomTimelineSegments(room, schedules, 585);
    const pastGap = segments.find((s) => s.id === "pre-gap-11-past");
    expect(pastGap?.type).toBe("past");
    expect(pastGap?.startMinutes).toBe(420);
    expect(pastGap?.endMinutes).toBe(585);
    expect(pastGap?.title).toBe("Đã qua: 07:00 - 09:45");

    const freeGap = segments.find((s) => s.id === "pre-gap-11");
    expect(freeGap?.type).toBe("free");
    expect(freeGap?.startMinutes).toBe(585);
    expect(freeGap?.endMinutes).toBe(780);
    expect(freeGap?.title).toBe("Trống: 09:45 - 13:00");
  });

  it("buildRoomTimelineSegments does not invite booking on a past day", () => {
    const room = {
      id: 9,
      name: "Phòng A103",
      roomCode: "A103",
      capacity: 5,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const segments = buildRoomTimelineSegments(room, [], 24 * 60);
    expect(segments[0].type).toBe("full-free");
    expect(segments[0].subtitle).toBe("Ngày đã qua");
    expect(segments[0]).not.toHaveProperty("actionText");
  });

  it("buildRoomTimelineSegments builds booked, free and gap segments", () => {
    const room = {
      id: 7,
      name: "Phòng A101",
      roomCode: "A101",
      capacity: 7,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 1,
        bookingId: 1,
        activityName: "Học nhóm Giải tích 2",
        purpose: "SV: 200121092 (Nhóm 4)",
        startAt: "2026-10-14T01:00:00Z", // 08:00 UTC+7
        endAt: "2026-10-14T03:00:00Z",   // 10:00 UTC+7
        guestCount: 5,
        status: "Đã duyệt",
      },
    ];

    // Với currentMinutes = 400 (06:40, trước ca 08:00 - 10:00)
    const segmentsBefore = buildRoomTimelineSegments(room, schedules, 400);
    const booked = segmentsBefore.find((s) => s.type === "booked");
    expect(booked).toBeDefined();
    expect(booked?.title).toBe("Học nhóm Giải tích 2");
    expect(booked?.badgeText).toBe("ĐÃ ĐẶT");

    // Với currentMinutes = 585 (09:45, đang diễn ra)
    const segmentsDuring = buildRoomTimelineSegments(room, schedules, 585);
    const inUse = segmentsDuring.find((s) => s.type === "in-use");
    expect(inUse).toBeDefined();
    expect(inUse?.badgeText).toBe("ĐANG DIỄN RA");

    const postGap = segmentsDuring.find((s) => s.id.startsWith("post-gap"));
    expect(postGap).toBeDefined();
    expect(postGap?.title).toContain("Trống");
  });

  it("buildRoomTimelineSegments marks pending bookings distinctly", () => {
    const room = {
      id: 8,
      name: "Phòng A102",
      roomCode: "A102",
      capacity: 7,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const schedules: RoomScheduleItem[] = [
      {
        bookingDetailId: 77,
        bookingId: 70,
        activityName: "Họp nhóm",
        purpose: "Bài tập lớn",
        startAt: "2026-10-14T03:00:00Z", // 10:00 UTC+7
        endAt: "2026-10-14T05:00:00Z",   // 12:00 UTC+7
        guestCount: 4,
        status: "Chờ duyệt",
      },
    ];

    const segments = buildRoomTimelineSegments(room, schedules, 480);
    const pending = segments.find((s) => s.booking?.bookingId === 70);
    expect(pending?.type).toBe("booked");
    expect(pending?.isPending).toBe(true);
    expect(pending?.badgeText).toBe("CHỜ DUYỆT");
  });

  it("getRoomBadgeInfo returns proper badges for different states", () => {
    const roomFree = {
      id: 1,
      name: "A103",
      roomCode: "A103",
      capacity: 5,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    expect(getRoomBadgeInfo(roomFree, []).text).toBe("100% Trống");

    const roomHall = {
      id: 2,
      name: "B201",
      roomCode: "B201",
      capacity: 60,
      status: "Available",
      roomTypeId: 2,
      isBookingByPeriod: false,
    };
    expect(getRoomBadgeInfo(roomHall, []).text).toBe("100% Trống");

    const roomInUse = {
      id: 3,
      name: "A104",
      roomCode: "A104",
      capacity: 7,
      status: "Đang sử dụng",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    expect(getRoomBadgeInfo(roomInUse, []).text).toBe("● Đang sử dụng");

    const roomMaintenance = {
      id: 4,
      name: "A105",
      roomCode: "A105",
      capacity: 7,
      status: "Maintenance",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    expect(getRoomBadgeInfo(roomMaintenance, []).variant).toBe("maintenance");

    const roomVietnameseInUse = {
      id: 5,
      name: "A106",
      roomCode: "A106",
      capacity: 7,
      status: "Đang sử dụng",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    expect(getRoomBadgeInfo(roomVietnameseInUse, []).variant).toBe("in-use");
  });

  it("parseRoomAmenities extracts amenity icons and labels", () => {
    const room = {
      id: 1,
      name: "A101",
      roomCode: "A101",
      capacity: 7,
      status: "Available",
      description: "Màn chiếu TV • 6 Ổ cắm",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const amenities = parseRoomAmenities(room);
    expect(amenities).toHaveLength(3);
    expect(amenities[0].label).toBe("7 chỗ");
    expect(amenities[1].iconType).toBe("tv");
    expect(amenities[2].iconType).toBe("plug");
  });

  it("computeMatrixKpis calculates summary metrics correctly", () => {
    const rooms = [
      { id: 1, name: "A101", roomCode: "A101", capacity: 7, status: "Available", roomTypeId: 1, isBookingByPeriod: false },
      { id: 2, name: "A102", roomCode: "A102", capacity: 7, status: "Available", roomTypeId: 1, isBookingByPeriod: false },
      { id: 3, name: "A103", roomCode: "A103", capacity: 5, status: "Available", roomTypeId: 1, isBookingByPeriod: false },
    ];
    const schedulesByRoom = {
      1: [{ bookingDetailId: 1, bookingId: 1, activityName: "T1", purpose: "P1", startAt: "2026-10-14T01:00:00Z", endAt: "2026-10-14T03:00:00Z", guestCount: 5, status: "Đã duyệt" }],
      2: [{ bookingDetailId: 2, bookingId: 2, activityName: "T2", purpose: "P2", startAt: "2026-10-14T04:00:00Z", endAt: "2026-10-14T05:00:00Z", guestCount: 4, status: "Chờ duyệt" }],
    };

    const kpis = computeMatrixKpis(rooms, schedulesByRoom, "2026-10-14", 585);
    expect(kpis.availableText).toBe("2 / 3 Phòng");
    // Chờ duyệt không được tính vào lượt đặt đã xác nhận
    expect(kpis.confirmedText).toBe("1 Lượt đặt");
    expect(kpis.inUseText).toBe("1 Phiên đang dùng");
    expect(kpis.inUseSub).toContain("A101");
    expect(kpis.checkinTitle).toBe("Nhận phòng trực tuyến");

    const emptyKpis = computeMatrixKpis(rooms, {}, "2026-10-14", 585);
    expect(emptyKpis.availableText).toBe("3 / 3 Phòng");
    expect(emptyKpis.inUseText).toBe("0 Phiên đang dùng");
    expect(emptyKpis.inUseSub).toBe("Không có phiên đang sử dụng");
  });

  it("computeMatrixKpis excludes rooms under maintenance from available", () => {
    const rooms = [
      { id: 1, name: "A101", roomCode: "A101", capacity: 7, status: "Available", roomTypeId: 1, isBookingByPeriod: false },
      { id: 2, name: "A102", roomCode: "A102", capacity: 7, status: "Bảo trì", roomTypeId: 1, isBookingByPeriod: false },
    ];
    const kpis = computeMatrixKpis(rooms, {}, "2026-10-14", 585);
    expect(kpis.availableText).toBe("1 / 2 Phòng");
  });
});

describe("schedule range and view helpers", () => {
  function makeRoom(id: number, status = "Available"): {
    id: number;
    name: string;
    roomCode: string;
    capacity: number;
    status: string;
    roomTypeId: number;
    isBookingByPeriod: boolean;
  } {
    return {
      id,
      name: `Phòng ${id}`,
      roomCode: `P${id}`,
      capacity: 7,
      status,
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
  }

  function makeSchedule(
    overrides: Partial<RoomScheduleItem> = {}
  ): RoomScheduleItem {
    return {
      bookingDetailId: 1,
      bookingId: 1,
      activityName: "Hoạt động",
      purpose: "Mục đích",
      startAt: "2026-10-15T01:00:00Z",
      endAt: "2026-10-15T03:00:00Z",
      guestCount: 5,
      status: "Đã duyệt",
      ...overrides,
    };
  }

  it("buildTimelineColumns splits the window into hourly columns", () => {
    const columns = buildTimelineColumns(420, 1200);
    expect(columns).toHaveLength(13);
    expect(columns[0]).toEqual({
      startMin: 420,
      endMin: 480,
      label: "07:00",
    });
    expect(columns[12]).toEqual({
      startMin: 1140,
      endMin: 1200,
      label: "19:00",
    });
  });

  it("computeTimelineWindow keeps defaults and expands for early/late bookings", () => {
    const base = computeTimelineWindow([]);
    expect(base.startMin).toBe(420);
    expect(base.endMin).toBe(1200);
    expect(base.durationMin).toBe(780);
    expect(base.columns).toHaveLength(13);

    const expanded = computeTimelineWindow([
      makeSchedule({
        startAt: "2026-10-15T06:00:00",
        endAt: "2026-10-15T21:30:00",
      }),
    ]);
    expect(expanded.startMin).toBe(360);
    expect(expanded.endMin).toBe(1320);
  });

  it("normalizeRoomStatus understands both English and Vietnamese values", () => {
    expect(normalizeRoomStatus("Available")).toBe("available");
    expect(normalizeRoomStatus("Trống")).toBe("available");
    expect(normalizeRoomStatus("Đang sử dụng")).toBe("in-use");
    expect(normalizeRoomStatus("InUse")).toBe("in-use");
    expect(normalizeRoomStatus("Bảo trì")).toBe("maintenance");
    expect(normalizeRoomStatus("Maintenance")).toBe("maintenance");
    expect(normalizeRoomStatus("")).toBe("available");
    expect(normalizeRoomStatus("Khác")).toBe("other");
  });

  it("toVietnamDateKey converts UTC timestamps to the Vietnam date", () => {
    expect(toVietnamDateKey("2026-10-14T18:00:00Z")).toBe("2026-10-15");
    expect(toVietnamDateKey("2026-10-14T16:59:00Z")).toBe("2026-10-14");
    expect(toVietnamDateKey("2026-10-15T10:00:00")).toBe("2026-10-15");
  });

  it("getWeekDays returns Monday-first weeks", () => {
    expect(getWeekDays("2026-10-15")).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
    expect(getWeekDays("2026-10-18")[0]).toBe("2026-10-12");
  });

  it("getMonthGrid returns a Monday-first grid covering the month", () => {
    const grid = getMonthGrid("2026-10-15");
    expect(grid).toHaveLength(35);
    expect(grid[0].dateKey).toBe("2026-09-28");
    expect(grid[grid.length - 1].dateKey).toBe("2026-11-01");
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("buildDayStats counts bookings and free rooms per day", () => {
    const rooms = [
      makeRoom(1),
      makeRoom(2, "Maintenance"),
      makeRoom(3, "Trống"),
    ];
    const schedules: RoomScheduleItem[] = [
      makeSchedule({ roomId: 1, status: "Đã duyệt" }),
      makeSchedule({ roomId: 1, status: "Chờ duyệt" }),
      makeSchedule({ roomId: 2, status: "Đã duyệt" }),
      makeSchedule({ roomId: 99, status: "Đã duyệt" }),
      makeSchedule({ roomId: 1, status: "Từ chối" }),
      makeSchedule({
        roomId: 3,
        startAt: "2026-10-16T01:00:00Z",
        endAt: "2026-10-16T03:00:00Z",
      }),
    ];

    const stats = buildDayStats(rooms, schedules, [
      "2026-10-15",
      "2026-10-16",
    ]);

    expect(stats["2026-10-15"].bookingCount).toBe(3);
    expect(stats["2026-10-15"].busyRoomCount).toBe(2);
    expect(stats["2026-10-15"].maintenanceRoomCount).toBe(1);
    expect(stats["2026-10-15"].freeRoomCount).toBe(1);

    expect(stats["2026-10-16"].bookingCount).toBe(1);
    expect(stats["2026-10-16"].freeRoomCount).toBe(1);
  });

  it("groupSchedulesByRoom groups schedules by room id", () => {
    const grouped = groupSchedulesByRoom([
      makeSchedule({ roomId: 1, bookingDetailId: 1 }),
      makeSchedule({ roomId: 1, bookingDetailId: 2 }),
      makeSchedule({ roomId: 2, bookingDetailId: 3 }),
    ]);
    expect(grouped[1]).toHaveLength(2);
    expect(grouped[2]).toHaveLength(1);
  });

  it("groupSchedulesByRoomAndDate groups by room and Vietnam date", () => {
    const grouped = groupSchedulesByRoomAndDate([
      makeSchedule({ roomId: 1, startAt: "2026-10-14T18:00:00Z" }),
      makeSchedule({ roomId: 1, startAt: "2026-10-15T02:00:00Z" }),
      makeSchedule({ roomId: 2, startAt: "2026-10-15T18:00:00Z" }),
    ]);
    expect(grouped["1|2026-10-15"]).toHaveLength(2);
    expect(grouped["2|2026-10-16"]).toHaveLength(1);
  });

  it("getSuggestedBookingSlot picks a valid 2-hour slot", () => {
    // Ngày đã qua: không gợi ý
    expect(getSuggestedBookingSlot("2026-10-14", "2026-10-15", 790)).toBeNull();

    // Hôm nay 13:10 -> 14:00 - 16:00
    expect(getSuggestedBookingSlot("2026-10-15", "2026-10-15", 790)).toEqual({
      start: "14:00",
      end: "16:00",
    });

    // Hôm nay 19:30 -> không còn đủ giờ
    expect(getSuggestedBookingSlot("2026-10-15", "2026-10-15", 1170)).toBeNull();

    // Ngày tương lai -> 07:00 - 09:00
    expect(getSuggestedBookingSlot("2026-10-16", "2026-10-15", 790)).toEqual({
      start: "07:00",
      end: "09:00",
    });
  });
});
