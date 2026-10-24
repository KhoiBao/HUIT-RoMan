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
  getRoomBadgeInfo,
  parseRoomAmenities,
  computeMatrixKpis,
  type Period,
  type RoomScheduleItem,
} from "./schedule";

describe("schedule pure functions", () => {
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
    // 07:30 to 19:30 is 720 min
    // 07:30 to 19:30 -> left 0%, width 100%
    const full = calculateTimelinePosition(450, 1170);
    expect(full.leftPercent).toBe(0);
    expect(full.widthPercent).toBe(100);

    // 08:00 (480) to 10:00 (600): left (30/720)*100 = 4.167%, width (120/720)*100 = 16.667%
    const slot = calculateTimelinePosition(480, 600);
    expect(slot.leftPercent).toBeCloseTo(4.167, 1);
    expect(slot.widthPercent).toBeCloseTo(16.667, 1);
  });

  it("calculateCurrentTimeIndicator detects visibility and position", () => {
    // 09:45 is 585 min -> inside 450 - 1170
    const ind = calculateCurrentTimeIndicator(585);
    expect(ind.isVisible).toBe(true);
    expect(ind.timeLabel).toBe("09:45");
    expect(ind.leftPercent).toBeCloseTo(18.75, 1);

    // 05:00 is 300 min -> outside
    const early = calculateCurrentTimeIndicator(300);
    expect(early.isVisible).toBe(false);
  });

  it("buildRoomTimelineSegments returns full-free for room with no schedules", () => {
    const room = {
      id: 9,
      name: "Phòng A103",
      roomCode: "A103",
      capacity: 5,
      status: "Available",
      roomTypeId: 1,
      isBookingByPeriod: false,
    };
    const segments = buildRoomTimelineSegments(room, []);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe("full-free");
    expect(segments[0].actionText).toBe("ĐĂNG KÝ NGAY");
    expect(segments[0].widthPercent).toBe(100);
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
    expect(postGap?.title).toContain("Khung giờ trống");
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
    expect(getRoomBadgeInfo(roomHall, []).text).toBe("Hội trường");

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
    };

    const kpis = computeMatrixKpis(rooms, schedulesByRoom, "2026-10-14", 585);
    expect(kpis.availableText).toBe("2 / 3 Phòng");
    expect(kpis.confirmedText).toBe("1 Lượt đặt");
    expect(kpis.inUseText).toBe("1 Phiên đang dùng");
    expect(kpis.inUseSub).toContain("A101");
    expect(kpis.checkinTitle).toBe("Check-in Thẻ HUIT");

    const emptyKpis = computeMatrixKpis(rooms, {}, "2026-10-14", 585);
    expect(emptyKpis.availableText).toBe("3 / 3 Phòng");
    expect(emptyKpis.inUseText).toBe("0 Phiên đang dùng");
    expect(emptyKpis.inUseSub).toBe("Không có phiên đang sử dụng");
  });
});
