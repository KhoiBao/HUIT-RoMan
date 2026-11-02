// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllIncidents,
  getIncidentById,
  getIncidentsByRoom,
  createIncident,
  updateIncident,
  resolveIncident,
  deleteIncident,
  resetToDefaultIncidents,
  getIncidentStats,
  DEFAULT_INCIDENTS,
} from "./incidents";

describe("incidents.ts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default incidents when storage is empty", () => {
    const list = getAllIncidents();
    expect(list.length).toBe(DEFAULT_INCIDENTS.length);
    expect(list.some((item) => item.roomCode === "B202")).toBe(true);
  });

  it("creates a new incident and prepends it", () => {
    const newItem = createIncident({
      roomCode: "B202",
      roomName: "Phòng học nhóm B202",
      description: "Hỏng máy chiếu khi trả phòng",
      severity: "Khẩn cấp",
      category: "Thiết bị hư hỏng",
    });

    expect(newItem.roomCode).toBe("B202");
    expect(newItem.code).toMatch(/^#SC-/);
    expect(newItem.status).toBe("Chờ tiếp nhận");

    const all = getAllIncidents();
    expect(all[0].id).toBe(newItem.id);
  });

  it("finds incident by ID or code", () => {
    const item = getIncidentById("INC-20261102-001");
    expect(item).toBeDefined();
    expect(item?.roomCode).toBe("B202");

    const byCode = getIncidentById("#SC-20261102-001");
    expect(byCode?.id).toBe("INC-20261102-001");
  });

  it("filters incidents by room code", () => {
    const items = getIncidentsByRoom("B202");
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].roomCode).toBe("B202");
  });

  it("updates an incident successfully", () => {
    const updated = updateIncident("INC-20261102-001", {
      status: "Đang bảo trì",
      assignedTechnician: "KTV. Lê Hoàng",
      technicianNote: "Đang thay thế linh kiện",
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("Đang bảo trì");
    expect(updated?.assignedTechnician).toBe("KTV. Lê Hoàng");
  });

  it("resolves an incident and marks status as 'Đã khắc phục'", () => {
    const resolved = resolveIncident("INC-20261102-001", {
      technicianNote: "Đã sửa xong máy chiếu và thay dây cáp mới.",
      repairCost: 150000,
      resolvedBy: "KTV. Lê Hoàng",
    });

    expect(resolved).not.toBeNull();
    expect(resolved?.status).toBe("Đã khắc phục");
    expect(resolved?.resolvedAt).toBeDefined();
    expect(resolved?.repairCost).toBe(150000);
  });

  it("deletes an incident", () => {
    const deleted = deleteIncident("INC-20261028-003");
    expect(deleted).toBe(true);

    const all = getAllIncidents();
    expect(all.some((i) => i.id === "INC-20261028-003")).toBe(false);
  });

  it("remains empty and does not restore when all incidents are deleted", () => {
    resetToDefaultIncidents();
    const all = getAllIncidents();
    for (const item of all) {
      deleteIncident(item.id);
    }
    const emptyList = getAllIncidents();
    expect(emptyList.length).toBe(0);
  });

  it("calculates incident statistics correctly", () => {
    resetToDefaultIncidents();
    createIncident({
      roomCode: "B301",
      description: "Đang sửa chữa bảng tương tác",
      status: "Đang bảo trì",
    });
    const stats = getIncidentStats();
    expect(stats.total).toBe(DEFAULT_INCIDENTS.length + 1);
    expect(stats.pending).toBeGreaterThanOrEqual(1);
    expect(stats.inMaintenance).toBeGreaterThanOrEqual(1);
  });
});

