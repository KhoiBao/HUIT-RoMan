import { describe, it, expect } from "vitest";
import {
  validateBookingForm,
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
});
