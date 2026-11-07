import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";
import {
  rejectPendingBookingsApi,
  bulkCancelBookingsApi,
  bulkApproveBookingsApi,
  cancelBookingByStaffApi,
  cancelBookingDetailByStaffApi,
} from "./booking";

vi.mock("./api", () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Bulk and Cancel Booking APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejectPendingBookingsApi calls /api/Bookings/auto-approval/reject-pending with reason", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, data: { rejectedCount: 5, failedCount: 0 } },
    });

    const res = await rejectPendingBookingsApi("Khu học thuật tạm đóng cửa");
    expect(api.post).toHaveBeenCalledWith(
      "/api/Bookings/auto-approval/reject-pending",
      { reason: "Khu học thuật tạm đóng cửa" }
    );
    expect(res).toEqual({ rejectedCount: 5, failedCount: 0 });
  });

  it("bulkCancelBookingsApi calls /api/Bookings/bulk-cancel with bookingIds and reason", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, data: { cancelledCount: 2, failedCount: 0 } },
    });

    const res = await bulkCancelBookingsApi([10, 20], "Bảo trì khẩn cấp");
    expect(api.post).toHaveBeenCalledWith("/api/Bookings/bulk-cancel", {
      bookingIds: [10, 20],
      reason: "Bảo trì khẩn cấp",
    });
    expect(res).toEqual({ cancelledCount: 2, failedCount: 0 });
  });

  it("bulkApproveBookingsApi calls /api/Bookings/bulk-approve with bookingIds", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, data: { approvedCount: 3, failedCount: 0 } },
    });

    const res = await bulkApproveBookingsApi([1, 2, 3]);
    expect(api.post).toHaveBeenCalledWith("/api/Bookings/bulk-approve", {
      bookingIds: [1, 2, 3],
    });
    expect(res).toEqual({ approvedCount: 3, failedCount: 0 });
  });

  it("cancelBookingByStaffApi calls /api/Bookings/{id}/cancel with reason", async () => {
    (api.patch as any).mockResolvedValueOnce({
      data: { success: true },
    });

    const res = await cancelBookingByStaffApi(42, "Lý do hủy đơn toàn bộ");
    expect(api.patch).toHaveBeenCalledWith("/api/Bookings/42/cancel", {
      reason: "OTHER",
      reasonDetail: "Lý do hủy đơn toàn bộ",
    });
    expect(res).toBe(true);
  });

  it("cancelBookingDetailByStaffApi calls /api/Bookings/details/{detailId}/cancel with reason", async () => {
    (api.patch as any).mockResolvedValueOnce({
      data: { success: true },
    });

    const res = await cancelBookingDetailByStaffApi(88, "Lý do hủy phòng");
    expect(api.patch).toHaveBeenCalledWith("/api/Bookings/details/88/cancel", {
      reason: "OTHER",
      reasonDetail: "Lý do hủy phòng",
    });
    expect(res).toBe(true);
  });
});
