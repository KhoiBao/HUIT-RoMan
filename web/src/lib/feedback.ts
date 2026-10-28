import { api } from "./api";

export interface FeedbackItem {
  id: number;
  rating: number;
  comment: string;
  userId: number;
  userName: string;
  userCardCode: string;
  usageSessionId?: number;
  bookingId?: number;
  roomId?: number;
  roomName: string;
  startAt?: string;
  endAt?: string;
  createdAt: string;
}

export interface FeedbackListResponse {
  totalCount: number;
  averageRating: number;
  page: number;
  pageSize: number;
  items: FeedbackItem[];
}

export interface CreateFeedbackPayload {
  bookingId?: number;
  usageSessionId?: number;
  rating: number;
  comment?: string;
}

export interface RoomFeedbackSummary {
  roomId: number;
  roomName: string;
  averageRating: number;
  totalFeedbacks: number;
  star5Count: number;
  star4Count: number;
  star3Count: number;
  star2Count: number;
  star1Count: number;
}

export async function createFeedbackApi(payload: CreateFeedbackPayload): Promise<FeedbackItem> {
  const res = await api.post("/api/Feedbacks", payload);
  return (res.data?.data ?? res.data) as FeedbackItem;
}

export async function fetchFeedbackByBookingApi(bookingId: number): Promise<FeedbackItem | null> {
  try {
    const res = await api.get(`/api/Feedbacks/by-booking/${bookingId}`);
    return (res.data?.data ?? null) as FeedbackItem | null;
  } catch {
    return null;
  }
}

export async function fetchFeedbackBySessionApi(sessionId: number): Promise<FeedbackItem | null> {
  try {
    const res = await api.get(`/api/Feedbacks/by-session/${sessionId}`);
    return (res.data?.data ?? null) as FeedbackItem | null;
  } catch {
    return null;
  }
}

export async function fetchRoomFeedbackSummaryApi(roomId: number): Promise<RoomFeedbackSummary> {
  const res = await api.get(`/api/Feedbacks/room-summary/${roomId}`);
  return (res.data?.data ?? res.data) as RoomFeedbackSummary;
}

export async function fetchFeedbacksApi(params?: {
  roomId?: number;
  rating?: number;
  bookingId?: number;
  page?: number;
  pageSize?: number;
}): Promise<FeedbackListResponse> {
  const query = new URLSearchParams();
  if (params?.roomId) query.set("roomId", String(params.roomId));
  if (params?.rating) query.set("rating", String(params.rating));
  if (params?.bookingId) query.set("bookingId", String(params.bookingId));
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  const res = await api.get(`/api/Feedbacks?${query.toString()}`);
  return (res.data?.data ?? res.data) as FeedbackListResponse;
}

