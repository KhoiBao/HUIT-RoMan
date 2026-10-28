import { describe, it, expect } from "vitest";
import {
  validateBookingForm,
  validateStudentBookingWindow,
  getNextStudentBookingSlot,
  groupAvailableRoomsByType,
  groupAvailableRoomsByBuilding,
  filterAvailableRoomsByScope,
  summarizeRoomLocations,
  isHallRoomType,
  isStudentBookableRoomType,
  isStudentRole,
  buildBookingPayload,
  canCancelBooking,
  formatDetailTimeRange,
  evaluateCheckInWindow,
  canCancelBookingOnline,
  validateCancelReasonSelection,
  getBookingStartAt,
  describeCancelReason,
  describeCancelSource,
  isApprovedBookingStatus,
  parseDdMmYyyy,
  formatDdMmYyyy,
  getBookingDatePresetRange,
  isIsoDateInRange,
  type BookingFormState,
  type AvailableRoom,
  type BookingDetailItem,
  type BookingResponse,
} from "./booking";
import type { Period } from "./schedule";

describe("booking pure functions", () => {
  function makeRoom(overrides: Partial<AvailableRoom>): AvailableRoom {
    return {
      roomId: 1,
      roomName: `Phòng ${overrides.roomCode ?? "A201"}`,
      roomCode: "A201",
      building: "A",
      floor: "2",
      capacity: 60,
      roomTypeId: 1,
      roomTypeName: "Phòng Lý thuyết",
      isBookingByPeriod: true,
      ...overrides,
    };
  }

  it("validateBookingForm detects empty activity name, purpose, guest count, and rooms", () => {
    const form: BookingFormState = {
      activityName: "",
      purpose: "",
      guestCount: 0,
      note: "",
      date: "",
      bookingMode: "period",
    };

    const res = validateBookingForm(form, []);
    expect(res.isValid).toBe(false);
    expect(res.errors.activityName).toBeDefined();
    expect(res.errors.purpose).toBeDefined();
    expect(res.errors.guestCount).toBeDefined();
    expect(res.errors.date).toBeDefined();
    expect(res.errors.rooms).toBeDefined();
  });

  it("validateBookingForm enforces startPeriod <= endPeriod", () => {
    const form: BookingFormState = {
      activityName: "Thuyết trình môn học",
      purpose: "Học tập",
      guestCount: 30,
      note: "",
      date: "2099-12-31",
      bookingMode: "period",
      startPeriodId: 4,
      endPeriodId: 2,
    };

    const res = validateBookingForm(form, [1]);
    expect(res.isValid).toBe(false);
    expect(res.errors.endPeriodId).toContain("Tiết kết thúc phải bằng hoặc sau tiết bắt đầu");
  });

  it("validateBookingForm enforces startTime < endTime", () => {
    const form: BookingFormState = {
      activityName: "Hội thảo Đoàn Thanh niên",
      purpose: "Sự kiện",
      guestCount: 100,
      note: "",
      date: "2099-12-31",
      bookingMode: "time",
      startTime: "10:00",
      endTime: "09:00",
    };

    const res = validateBookingForm(form, [1]);
    expect(res.isValid).toBe(false);
    expect(res.errors.endTime).toContain("Giờ kết thúc phải sau giờ bắt đầu");
  });

  it("validateBookingForm passes with valid inputs", () => {
    const form: BookingFormState = {
      activityName: "Bảo vệ đồ án",
      purpose: "Học phần tốt nghiệp",
      guestCount: 25,
      note: "Cần máy chiếu",
      date: "2099-12-31",
      bookingMode: "period",
      startPeriodId: 1,
      endPeriodId: 3,
    };

    const res = validateBookingForm(form, [2]);
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it("buildBookingPayload builds correct payload for period and hourly rooms", () => {
    const form: BookingFormState = {
      activityName: "Seminar AI",
      purpose: "Nghiên cứu",
      guestCount: 50,
      note: "Phòng lạnh",
      date: "2026-10-20",
      bookingMode: "period",
      startPeriodId: 1,
      endPeriodId: 2,
    };

    const periods: Period[] = [
      { id: 1, name: "Tiết 1", startTime: "06:30:00", endTime: "07:20:00" },
      { id: 2, name: "Tiết 2", startTime: "07:20:00", endTime: "08:10:00" },
    ];

    const selectedRooms: AvailableRoom[] = [
      {
        roomId: 2,
        roomName: "Phòng Lý thuyết A301",
        roomCode: "A301",
        capacity: 45,
        roomTypeId: 3,
        roomTypeName: "Phòng Lý thuyết",
        isBookingByPeriod: true,
      },
    ];

    const payload = buildBookingPayload(form, selectedRooms, periods);
    expect(payload.activityName).toBe("Seminar AI");
    expect(payload.guestCount).toBe(50);
    expect(payload.details).toHaveLength(1);
    expect(payload.details[0].roomId).toBe(2);
    expect(payload.details[0].startPeriodId).toBe(1);
    expect(payload.details[0].endPeriodId).toBe(2);
  });

  it("canCancelBooking correctly evaluates cancellation eligibility", () => {
    expect(canCancelBooking("Chờ duyệt")).toBe(true);
    expect(canCancelBooking("Đã duyệt")).toBe(true);
    expect(canCancelBooking("Từ chối")).toBe(false);
    expect(canCancelBooking("Đã hủy")).toBe(false);
  });

  it("formatDetailTimeRange formats period or hour strings", () => {
    const detailWithPeriod: BookingDetailItem = {
      id: 1,
      roomId: 2,
      startAt: "2026-10-20T06:30:00Z",
      endAt: "2026-10-20T08:10:00Z",
      startPeriodName: "Tiết 1",
      endPeriodName: "Tiết 2",
      guestCount: 30,
      status: "Chờ duyệt",
      createdAt: "2026-10-20T00:00:00Z",
    };
    expect(formatDetailTimeRange(detailWithPeriod)).toBe("Tiết 1 → Tiết 2");
  });

  it("only group study and presentation room types are bookable by students", () => {
    expect(isStudentBookableRoomType("Phòng học nhóm")).toBe(true);
    expect(isStudentBookableRoomType("Phòng thuyết trình")).toBe(true);
    expect(isStudentBookableRoomType("Phòng hội thảo")).toBe(false);
    expect(isStudentBookableRoomType("Phòng Lý thuyết")).toBe(false);
    expect(isStudentRole("Student")).toBe(true);
    expect(isStudentRole("Sinh viên")).toBe(true);
    expect(isStudentRole("Employee")).toBe(false);
  });

  it("rejects Sunday bookings for students", () => {
    const form: BookingFormState = {
      activityName: "Học nhóm",
      purpose: "Ôn tập",
      guestCount: 5,
      note: "",
      date: "2026-10-25",
      bookingMode: "time",
      startTime: "08:00",
      endTime: "09:00",
    };

    const res = validateStudentBookingWindow(
      form,
      new Date(2026, 9, 24, 10, 0)
    );
    expect(res.isValid).toBe(false);
    expect(res.errors.date).toContain("Chủ Nhật");
  });

  it("rejects student bookings outside 07:00–20:00", () => {
    const form: BookingFormState = {
      activityName: "Học nhóm",
      purpose: "Ôn tập",
      guestCount: 5,
      note: "",
      date: "2026-10-26",
      bookingMode: "time",
      startTime: "06:30",
      endTime: "08:00",
    };

    const beforeOpen = validateStudentBookingWindow(
      form,
      new Date(2026, 9, 24, 10, 0)
    );
    expect(beforeOpen.isValid).toBe(false);
    expect(beforeOpen.errors.startTime).toContain("07:00");

    const afterClose = validateStudentBookingWindow(
      { ...form, startTime: "19:00", endTime: "20:30" },
      new Date(2026, 9, 24, 10, 0)
    );
    expect(afterClose.isValid).toBe(false);
    expect(afterClose.errors.endTime).toContain("20:00");
  });

  it("limits student bookings to two hours", () => {
    const form: BookingFormState = {
      activityName: "Học nhóm",
      purpose: "Ôn tập",
      guestCount: 5,
      note: "",
      date: "2026-10-26",
      bookingMode: "time",
      startTime: "08:00",
      endTime: "10:01",
    };

    const tooLong = validateStudentBookingWindow(
      form,
      new Date(2026, 9, 24, 10, 0)
    );
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.errors.endTime).toContain("2 giờ");

    const exactlyTwoHours = validateStudentBookingWindow(
      { ...form, endTime: "10:00" },
      new Date(2026, 9, 24, 10, 0)
    );
    expect(exactlyTwoHours.isValid).toBe(true);
  });

  it("rejects student bookings whose start time already passed", () => {
    const form: BookingFormState = {
      activityName: "Học nhóm",
      purpose: "Ôn tập",
      guestCount: 5,
      note: "",
      date: "2026-10-24",
      bookingMode: "time",
      startTime: "09:30",
      endTime: "10:30",
    };

    const res = validateStudentBookingWindow(
      form,
      new Date(2026, 9, 24, 10, 0)
    );
    expect(res.isValid).toBe(false);
    expect(res.errors.startTime).toContain("đã qua");
  });

  it("picks the next valid student slot, skipping Sunday and closing time", () => {
    const sunday = getNextStudentBookingSlot(new Date(2026, 9, 25, 10, 0));
    expect(sunday).toEqual({
      date: "2026-10-26",
      startTime: "07:00",
      endTime: "08:00",
    });

    const afterClose = getNextStudentBookingSlot(
      new Date(2026, 9, 24, 19, 30)
    );
    expect(afterClose).toEqual({
      date: "2026-10-26",
      startTime: "07:00",
      endTime: "08:00",
    });
  });

  it("groups available rooms by room type for the picker", () => {
    const rooms: AvailableRoom[] = [
      {
        roomId: 1,
        roomName: "Phòng học nhóm TV01",
        roomCode: "TV01",
        building: "Thư viện",
        floor: "3",
        capacity: 7,
        roomTypeId: 1,
        roomTypeName: "Phòng học nhóm",
        isBookingByPeriod: false,
      },
      {
        roomId: 2,
        roomName: "Phòng học nhóm TV02",
        roomCode: "TV02",
        building: "Thư viện",
        floor: "3",
        capacity: 7,
        roomTypeId: 1,
        roomTypeName: "Phòng học nhóm",
        isBookingByPeriod: false,
      },
      {
        roomId: 3,
        roomName: "Phòng thuyết trình TT01",
        roomCode: "TT01",
        building: "Thư viện",
        floor: "3",
        capacity: 20,
        roomTypeId: 2,
        roomTypeName: "Phòng thuyết trình",
        isBookingByPeriod: false,
      },
    ];

    const groups = groupAvailableRoomsByType(rooms);
    expect(groups).toHaveLength(2);
    expect(groups[0].roomTypeName).toBe("Phòng học nhóm");
    expect(groups[0].rooms.map((room) => room.roomCode)).toEqual([
      "TV01",
      "TV02",
    ]);
    expect(groups[1].rooms[0].roomCode).toBe("TT01");
  });

  it("filters time-based rooms by hall or library scope", () => {
    const rooms: AvailableRoom[] = [
      makeRoom({ roomId: 1, roomCode: "HT01", roomTypeName: "Phòng hội thảo" }),
      makeRoom({ roomId: 2, roomCode: "TV01", roomTypeName: "Phòng học nhóm" }),
      makeRoom({ roomId: 3, roomCode: "TT01", roomTypeName: "Phòng thuyết trình" }),
      makeRoom({ roomId: 4, roomCode: "A201", roomTypeName: "Phòng Lý thuyết" }),
    ];

    expect(filterAvailableRoomsByScope(rooms, "hall").map((r) => r.roomCode)).toEqual([
      "HT01",
    ]);
    expect(
      filterAvailableRoomsByScope(rooms, "library").map((r) => r.roomCode)
    ).toEqual(["TV01", "TT01"]);
    expect(filterAvailableRoomsByScope(rooms, "all")).toHaveLength(4);
    expect(isHallRoomType("Phòng hội thảo")).toBe(true);
    expect(isHallRoomType("Phòng học nhóm")).toBe(false);
  });

  it("groups available rooms by building and floor", () => {
    const rooms: AvailableRoom[] = [
      makeRoom({ roomId: 1, roomCode: "B201", building: "B", floor: "2" }),
      makeRoom({ roomId: 2, roomCode: "A305", building: "A", floor: "3" }),
      makeRoom({ roomId: 3, roomCode: "A201", building: "A", floor: "2" }),
      makeRoom({ roomId: 4, roomCode: "A202", building: "A", floor: "2" }),
    ];

    const buildings = groupAvailableRoomsByBuilding(rooms);
    expect(buildings.map((b) => b.building)).toEqual(["A", "B"]);
    expect(buildings[0].floors.map((f) => f.floor)).toEqual(["2", "3"]);
    expect(buildings[0].floors[0].rooms.map((r) => r.roomCode)).toEqual([
      "A201",
      "A202",
    ]);
    expect(buildings[0].rooms).toHaveLength(3);
    expect(buildings[1].floors[0].rooms[0].roomCode).toBe("B201");
  });

  it("summarizes room locations for the picker header", () => {
    expect(
      summarizeRoomLocations([
        makeRoom({ roomId: 1, roomCode: "A201", building: "A", floor: "2" }),
        makeRoom({ roomId: 2, roomCode: "A305", building: "A", floor: "3" }),
        makeRoom({ roomId: 3, roomCode: "B201", building: "B", floor: "2" }),
      ])
    ).toBe("Tòa A, B • Tầng 2–3");

    expect(
      summarizeRoomLocations([
        makeRoom({
          roomId: 4,
          roomCode: "TV01",
          building: "Thư viện",
          floor: "3",
          roomTypeName: "Phòng học nhóm",
        }),
      ])
    ).toBe("Thư viện • Tầng 3");

    expect(
      summarizeRoomLocations([
        makeRoom({ roomId: 5, roomCode: "A101", building: "A", floor: "1" }),
      ])
    ).toBe("Tòa A • Tầng 1");

    expect(summarizeRoomLocations([])).toBe("Thư viện HUIT");
  });
});

describe("check-in window & cancellation rules (mirror backend policy)", () => {
  const START = "2026-10-27T03:00:00.000Z"; // 10:00 giờ Việt Nam

  function makeBooking(
    overrides: Partial<BookingResponse> = {}
  ): BookingResponse {
    return {
      id: 1,
      activityName: "Học nhóm",
      purpose: "Ôn thi",
      guestCount: 4,
      status: "Đã duyệt",
      requestedAt: "2026-10-26T01:00:00.000Z",
      createdAt: "2026-10-26T01:00:00.000Z",
      userId: 10,
      checkedInAt: null,
      cancelReason: null,
      cancelReasonDetail: null,
      cancelSource: null,
      details: [
        {
          id: 100,
          roomId: 1,
          roomCode: "TV01",
          roomName: "Phòng học nhóm TV01",
          startAt: START,
          endAt: "2026-10-27T05:00:00.000Z",
          guestCount: 4,
          purpose: "Học nhóm",
          status: "Đã duyệt",
          createdAt: "2026-10-26T01:00:00.000Z",
        },
      ],
      ...overrides,
    };
  }

  it("evaluateCheckInWindow: trước T-15 phút → not_open với đếm ngược", () => {
    const now = new Date("2026-10-27T02:40:00.000Z"); // 09:40, còn 5 phút nữa mở (09:45)
    const info = evaluateCheckInWindow(START, now);
    expect(info.state).toBe("not_open");
    expect(info.remainingSeconds).toBe(300);
    expect(info.message).toBe("Có thể nhận phòng sau 05:00");
  });

  it("evaluateCheckInWindow: đúng T-15 phút → open ('Vui lòng nhận phòng trong 15:00')", () => {
    const now = new Date("2026-10-27T02:45:00.000Z"); // đúng 09:45
    const info = evaluateCheckInWindow(START, now);
    expect(info.state).toBe("open");
    expect(info.remainingSeconds).toBe(900);
    expect(info.message).toBe("Vui lòng nhận phòng trong 15:00");
  });

  it("evaluateCheckInWindow: ngay trước T → vẫn open", () => {
    const now = new Date("2026-10-27T02:59:59.000Z");
    const info = evaluateCheckInWindow(START, now);
    expect(info.state).toBe("open");
    expect(info.remainingSeconds).toBe(1);
  });

  it("evaluateCheckInWindow: đúng T → expired", () => {
    const now = new Date(START);
    const info = evaluateCheckInWindow(START, now);
    expect(info.state).toBe("expired");
    expect(info.message).toBe("Đã quá hạn nhận phòng");
  });

  it("canCancelBookingOnline: đơn chưa duyệt → không cho hủy", () => {
    const booking = makeBooking({ status: "Chờ duyệt" });
    const res = canCancelBookingOnline(booking, new Date("2026-10-26T01:00:00.000Z"));
    expect(res.allowed).toBe(false);
  });

  it("canCancelBookingOnline: đơn đã check-in → không cho hủy", () => {
    const booking = makeBooking({ checkedInAt: "2026-10-27T02:50:00.000Z" });
    const res = canCancelBookingOnline(booking, new Date("2026-10-26T01:00:00.000Z"));
    expect(res.allowed).toBe(false);
    expect(res.message).toContain("đã được nhận phòng");
  });

  it("canCancelBookingOnline: trước hạn 3 giờ → cho hủy", () => {
    const booking = makeBooking();
    const res = canCancelBookingOnline(booking, new Date("2026-10-27T00:00:00.000Z")); // 07:00 (T-3h)
    expect(res.allowed).toBe(true);
  });

  it("canCancelBookingOnline: sau hạn 3 giờ → không cho hủy", () => {
    const booking = makeBooking();
    const res = canCancelBookingOnline(booking, new Date("2026-10-27T00:01:00.000Z"));
    expect(res.allowed).toBe(false);
    expect(res.message).toContain("hạn hủy trực tuyến");
  });

  it("validateCancelReasonSelection: chưa chọn lý do → lỗi", () => {
    expect(validateCancelReasonSelection("", "").isValid).toBe(false);
  });

  it("validateCancelReasonSelection: OTHER không có chi tiết → lỗi", () => {
    const res = validateCancelReasonSelection("OTHER", "   ");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Lý do khác");
  });

  it("validateCancelReasonSelection: OTHER có chi tiết / CHANGE_PLAN → hợp lệ", () => {
    expect(validateCancelReasonSelection("OTHER", "Bận thi bất ngờ").isValid).toBe(true);
    expect(validateCancelReasonSelection("CHANGE_PLAN", "").isValid).toBe(true);
    expect(validateCancelReasonSelection("no_longer_needed", "").isValid).toBe(true);
  });

  it("getBookingStartAt: lấy StartAt sớm nhất của chi tiết còn hiệu lực", () => {
    const booking = makeBooking();
    booking.details = [
      { ...booking.details[0], id: 1, startAt: "2026-10-27T04:00:00.000Z", status: "Đã hủy" },
      { ...booking.details[0], id: 2, startAt: "2026-10-27T03:00:00.000Z", status: "Đã duyệt" },
      { ...booking.details[0], id: 3, startAt: "2026-10-27T05:00:00.000Z", status: "Từ chối" },
    ];
    expect(getBookingStartAt(booking)?.toISOString()).toBe("2026-10-27T03:00:00.000Z");
  });

  it("describeCancelReason: đơn cũ không có lý do → hiển thị an toàn", () => {
    const booking = makeBooking({ status: "Đã hủy", cancelReason: null });
    expect(describeCancelReason(booking)).toBe("Chưa có thông tin lý do hủy");
  });

  it("describeCancelReason: OTHER hiển thị nhãn + nội dung chi tiết", () => {
    const booking = makeBooking({
      status: "Đã hủy",
      cancelReason: "OTHER",
      cancelReasonDetail: "Bận đi khám bệnh",
    });
    expect(describeCancelReason(booking)).toBe("Lý do khác: Bận đi khám bệnh");
  });

  it("describeCancelSource: phân biệt sinh viên tự hủy / tự động hủy / quản trị hủy", () => {
    expect(describeCancelSource(makeBooking({ cancelSource: "STUDENT" })).label).toBe("Sinh viên tự hủy");
    expect(describeCancelSource(makeBooking({ cancelSource: "AUTO", cancelReason: "NO_SHOW" })).label).toContain("Tự động hủy");
    expect(describeCancelSource(makeBooking({ cancelSource: "STAFF" })).label).toBe("Quản trị viên hủy");
    expect(describeCancelSource(makeBooking()).label).toBe("Đã hủy");
  });

  it("isApprovedBookingStatus: chỉ Đã duyệt / Duyệt một phần", () => {
    expect(isApprovedBookingStatus("Đã duyệt")).toBe(true);
    expect(isApprovedBookingStatus("Duyệt một phần")).toBe(true);
    expect(isApprovedBookingStatus("Chờ duyệt")).toBe(false);
    expect(isApprovedBookingStatus("Đã hủy")).toBe(false);
  });
});

describe("booking date range helpers", () => {
  it("parseDdMmYyyy: đọc dd/mm/yyyy và loại ngày không hợp lệ", () => {
    expect(parseDdMmYyyy("05/01/2026")).toBe("2026-01-05");
    expect(parseDdMmYyyy("5/1/2026")).toBe("2026-01-05");
    expect(parseDdMmYyyy(" 28/10/2026 ")).toBe("2026-10-28");
    expect(parseDdMmYyyy("31/02/2026")).toBeNull();
    expect(parseDdMmYyyy("2026-01-05")).toBeNull();
    expect(parseDdMmYyyy("")).toBeNull();
  });

  it("formatDdMmYyyy: hiển thị ISO thành dd/mm/yyyy", () => {
    expect(formatDdMmYyyy("2026-01-05")).toBe("05/01/2026");
    expect(formatDdMmYyyy("2026-10-28")).toBe("28/10/2026");
    expect(formatDdMmYyyy("")).toBe("");
  });

  it("getBookingDatePresetRange: hôm nay, 7 ngày qua, tháng này", () => {
    expect(getBookingDatePresetRange("today", "2026-10-28")).toEqual({
      from: "2026-10-28",
      to: "2026-10-28",
    });
    expect(getBookingDatePresetRange("last7", "2026-10-28")).toEqual({
      from: "2026-10-22",
      to: "2026-10-28",
    });
    expect(getBookingDatePresetRange("month", "2026-10-28")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(getBookingDatePresetRange("month", "2026-02-10")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("isIsoDateInRange: tính cả hai đầu mút và bỏ ngày rỗng", () => {
    const range = { from: "2026-10-22", to: "2026-10-28" };
    expect(isIsoDateInRange("2026-10-22", range)).toBe(true);
    expect(isIsoDateInRange("2026-10-25", range)).toBe(true);
    expect(isIsoDateInRange("2026-10-28", range)).toBe(true);
    expect(isIsoDateInRange("2026-10-21", range)).toBe(false);
    expect(isIsoDateInRange("2026-10-29", range)).toBe(false);
    expect(isIsoDateInRange("", range)).toBe(false);
  });
});
