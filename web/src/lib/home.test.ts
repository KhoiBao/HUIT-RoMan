import { describe, expect, test } from "vitest";
import {
  buildRoomTypeSummaries,
  deriveRoomStates,
  formatCapacityRange,
  formatFloorList,
  getServiceHours,
  parseAmenities,
  pickFeaturedRoomTypes,
  summarizeStates,
  type RoomTypeItem,
} from "./home";
import type { Period, RoomItem, RoomScheduleItem } from "./schedule";

const room = (overrides: Partial<RoomItem>): RoomItem => ({
  id: 1,
  name: "Phòng A101",
  roomCode: "A101",
  building: "A",
  floor: "1",
  roomNumber: "101",
  capacity: 8,
  status: "Available",
  description: "Phòng học nhóm 8 chỗ • Smart TV • Bảng trắng",
  roomTypeId: 1,
  roomTypeName: "Phòng học nhóm",
  isBookingByPeriod: false,
  ...overrides,
});

const schedule = (
  overrides: Partial<RoomScheduleItem>
): RoomScheduleItem => ({
  bookingDetailId: 1,
  bookingId: 1,
  activityName: "Học nhóm",
  purpose: "Học tập",
  startAt: "2026-10-24T08:00:00+07:00",
  endAt: "2026-10-24T10:00:00+07:00",
  guestCount: 4,
  status: "Đã duyệt",
  ...overrides,
});

describe("home data helpers", () => {
  test("derives live room states from room status and schedule", () => {
    const now = new Date("2026-10-24T09:00:00+07:00");
    const rooms = [
      room({ id: 1 }),
      room({ id: 2, roomCode: "A102" }),
      room({ id: 3, roomCode: "A103" }),
      room({ id: 4, roomCode: "A104", status: "Bảo trì" }),
    ];

    const states = deriveRoomStates(
      rooms,
      {
        1: [schedule({ startAt: "2026-10-24T08:00:00+07:00", endAt: "2026-10-24T10:00:00+07:00" })],
        2: [schedule({ startAt: "2026-10-24T13:00:00+07:00", endAt: "2026-10-24T15:00:00+07:00" })],
        3: [schedule({ status: "Từ chối" })],
      },
      now
    );

    expect(states).toEqual({
      1: "inUse",
      2: "upcoming",
      3: "available",
      4: "maintenance",
    });
    expect(summarizeStates(states)).toEqual({
      available: 1,
      upcoming: 1,
      inUse: 1,
      maintenance: 1,
      total: 4,
    });
  });

  test("groups rooms by room type and counts live states", () => {
    const roomTypes: RoomTypeItem[] = [
      {
        id: 1,
        name: "Phòng học nhóm",
        description: "Phòng học nhóm 5-7 chỗ",
        defaultCapacity: 7,
        isBookingByPeriod: false,
      },
      {
        id: 2,
        name: "Hội trường",
        description: "Hội trường tổ chức sự kiện",
        defaultCapacity: 200,
        isBookingByPeriod: false,
      },
    ];
    const rooms = [
      room({ id: 1, capacity: 8 }),
      room({ id: 2, roomCode: "A102", capacity: 10 }),
      room({ id: 3, roomCode: "B201", roomTypeId: 2, capacity: 60, description: "Hội trường 60 chỗ • Máy chiếu" }),
    ];
    const states = { 1: "available", 2: "inUse", 3: "upcoming" } as const;

    const summaries = buildRoomTypeSummaries(roomTypes, rooms, states);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].name).toBe("Phòng học nhóm");
    expect(summaries[0].minCapacity).toBe(8);
    expect(summaries[0].maxCapacity).toBe(10);
    expect(summaries[0].availableCount).toBe(1);
    expect(summaries[0].inUseCount).toBe(1);
    expect(summaries[0].amenities).toEqual(["Smart TV", "Bảng trắng"]);
    expect(summaries[1].upcomingCount).toBe(1);
  });

  test("picks study-group and hall types for the featured cards", () => {
    const base: RoomTypeItem = {
      id: 1,
      name: "Phòng học nhóm",
      description: "",
      defaultCapacity: 8,
      isBookingByPeriod: false,
    };
    const summaries = buildRoomTypeSummaries(
      [
        base,
        { ...base, id: 2, name: "Hội trường" },
        { ...base, id: 3, name: "Phòng họp" },
      ],
      [
        room({ id: 1, roomTypeId: 1 }),
        room({ id: 2, roomCode: "B201", roomTypeId: 2 }),
        room({ id: 3, roomCode: "A201", roomTypeId: 3 }),
      ]
    );

    const { featured, others } = pickFeaturedRoomTypes(summaries);
    expect(featured.map((item) => item.name)).toEqual([
      "Phòng học nhóm",
      "Hội trường",
    ]);
    expect(others.map((item) => item.name)).toEqual(["Phòng họp"]);
  });

  test("formats capacity, floors, amenities and service hours", () => {
    expect(formatCapacityRange(8, 8)).toBe("8 chỗ");
    expect(formatCapacityRange(8, 10)).toBe("8–10 chỗ");
    expect(formatFloorList(["2", "1", "1"])).toBe("Tầng 1, 2");
    expect(parseAmenities("Phòng học nhóm 8 chỗ • Smart TV • Smart TV")).toEqual([
      "Smart TV",
    ]);

    const periods: Period[] = [
      { id: 1, name: "Tiết 1", startTime: "06:30:00", endTime: "07:20:00" },
      { id: 2, name: "Tiết 2", startTime: "19:45:00", endTime: "20:35:00" },
    ];
    expect(getServiceHours(periods)).toEqual({ open: "06:30", close: "20:35" });
  });
});
