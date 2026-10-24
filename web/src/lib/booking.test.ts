import { describe, it, expect } from "vitest";
import {
  validateBookingForm,
  validateStudentBookingWindow,
  getNextStudentBookingSlot,
  groupAvailableRoomsByType,
  isStudentBookableRoomType,
  isStudentRole,
  buildBookingPayload,
  canCancelBooking,
  formatDetailTimeRange,
  type BookingFormState,
  type AvailableRoom,
  type BookingDetailItem,
} from "./booking";
import type { Period } from "./schedule";

describe("booking pure functions", () => {
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
});
