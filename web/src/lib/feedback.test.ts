import { describe, expect, it } from "vitest";
import { type CreateFeedbackPayload, type RoomFeedbackSummary } from "./feedback";

describe("Feedback data models", () => {
  it("constructs a valid CreateFeedbackPayload", () => {
    const payload: CreateFeedbackPayload = {
      bookingId: 101,
      rating: 5,
      comment: "Phòng yên tĩnh và trang thiết bị tốt.",
    };
    expect(payload.bookingId).toBe(101);
    expect(payload.rating).toBe(5);
    expect(payload.comment).toContain("Phòng yên tĩnh");
  });

  it("handles empty RoomFeedbackSummary correctly", () => {
    const summary: RoomFeedbackSummary = {
      roomId: 1,
      roomName: "A101",
      averageRating: 0,
      totalFeedbacks: 0,
      star5Count: 0,
      star4Count: 0,
      star3Count: 0,
      star2Count: 0,
      star1Count: 0,
    };
    expect(summary.totalFeedbacks).toBe(0);
    expect(summary.averageRating).toBe(0);
  });
});
