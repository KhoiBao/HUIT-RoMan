// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchIncidents,
  createIncident,
  updateIncident,
  resolveIncident,
  deleteIncident,
  getIncidentStats,
  restoreRoomToAvailable,
} from "./incidents";
import { api } from "./api";

vi.mock("./api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("incidents.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches incidents from API and maps correctly", async () => {
    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            id: 1,
            code: "SC-20261101-001",
            targetType: "Phòng",
            roomCode: "TV02",
            roomName: "Phòng TV02",
            category: "Thiết bị hư hỏng",
            severity: "Khẩn cấp",
            description: "Bảng tương tác bị lỗi",
            status: "Đang bảo trì",
            reportedByName: "Thư viện viên",
            createdAt: "2026-11-01T00:00:00Z",
          },
        ],
      },
    });

    const list = await fetchIncidents();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe("1");
    expect(list[0].roomCode).toBe("TV02");
    expect(list[0].status).toBe("Đang bảo trì");
    expect(api.get).toHaveBeenCalledWith("/api/IncidentReports", { params: {} });
  });

  it("creates a new incident via POST /api/IncidentReports", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 5,
          code: "SC-20261107-005",
          roomCode: "B202",
          description: "Hỏng máy chiếu",
          status: "Chờ tiếp nhận",
          category: "Thiết bị hư hỏng",
          severity: "Khẩn cấp",
        },
      },
    });

    const newItem = await createIncident({
      roomCode: "B202",
      description: "Hỏng máy chiếu",
      category: "Thiết bị hư hỏng",
      severity: "Khẩn cấp",
    });

    expect(newItem.id).toBe("5");
    expect(newItem.roomCode).toBe("B202");
    expect(newItem.code).toBe("SC-20261107-005");
    expect(api.post).toHaveBeenCalledWith(
      "/api/IncidentReports",
      expect.objectContaining({
        roomCode: "B202",
        category: "Thiết bị hư hỏng",
      })
    );
  });

  it("updates an incident via PUT /api/IncidentReports/{id}", async () => {
    (api.put as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 1,
          code: "SC-20261101-001",
          roomCode: "TV02",
          status: "Đang bảo trì",
          assignedTechnician: "KTV. Lê Hoàng",
        },
      },
    });

    const updated = await updateIncident(1, {
      status: "Đang bảo trì",
      assignedTechnician: "KTV. Lê Hoàng",
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("Đang bảo trì");
    expect(updated?.assignedTechnician).toBe("KTV. Lê Hoàng");
    expect(api.put).toHaveBeenCalledWith(
      "/api/IncidentReports/1",
      expect.objectContaining({
        status: "Đang bảo trì",
      })
    );
  });

  it("resolves an incident via POST /api/IncidentReports/{id}/resolve", async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 1,
          code: "SC-20261101-001",
          roomCode: "TV02",
          status: "Đang khắc phục",
          repairCost: 150000,
        },
      },
    });

    const resolved = await resolveIncident("1", {
      technicianNote: "Đã sửa xong",
      repairCost: 150000,
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.status).toBe("Đang khắc phục");
    expect(resolved?.repairCost).toBe(150000);
    expect(api.post).toHaveBeenCalledWith(
      "/api/IncidentReports/1/resolve",
      expect.objectContaining({
        technicianNote: "Đã sửa xong",
        repairCost: 150000,
      })
    );
  });

  it("deletes an incident via DELETE /api/IncidentReports/{id}", async () => {
    (api.delete as any).mockResolvedValueOnce({ status: 200 });

    const deleted = await deleteIncident("2");
    expect(deleted).toBe(true);
    expect(api.delete).toHaveBeenCalledWith("/api/IncidentReports/2");
  });

  it("fetches incident statistics correctly", async () => {
    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          total: 10,
          pending: 3,
          inMaintenance: 2,
          resolved: 5,
          urgent: 1,
        },
      },
    });

    const stats = await getIncidentStats();
    expect(stats.total).toBe(10);
    expect(stats.pending).toBe(3);
    expect(stats.inMaintenance).toBe(2);
    expect(stats.resolved).toBe(5);
    expect(stats.urgent).toBe(1);
  });

  it("restores room to available via PATCH /api/Rooms/{id}/status", async () => {
    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });

    const result = await restoreRoomToAvailable(10, "TV02");
    expect(result.success).toBe(true);
    expect(api.patch).toHaveBeenCalledWith("/api/Rooms/10/status", {
      status: "Trống",
      reason: "Đã hoàn tất bảo trì / khắc phục sự cố kỹ thuật.",
    });
  });
});
