import { api } from "./api";

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: number;
  typeName: string;
  isRead: boolean;
  sentAt: string;
  readAt?: string | null;
  createdAt: string;
  userId: number;
}

export interface NotificationListResponse {
  totalCount: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  items: NotificationItem[];
}

export async function fetchNotifications(
  page = 1,
  pageSize = 20,
  isRead?: boolean
): Promise<NotificationListResponse> {
  const params: Record<string, any> = { page, pageSize };
  if (typeof isRead === "boolean") {
    params.isRead = isRead;
  }
  const res = await api.get("/api/Notifications", { params });
  return (
    res.data?.data ?? {
      totalCount: 0,
      unreadCount: 0,
      page,
      pageSize,
      items: [],
    }
  );
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await api.get("/api/Notifications/unread-count");
  return typeof res.data?.data === "number" ? res.data.data : 0;
}

export async function markNotificationAsRead(id: number): Promise<boolean> {
  const res = await api.put(`/api/Notifications/${id}/read`);
  return res.data?.success ?? true;
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const res = await api.put("/api/Notifications/read-all");
  return res.data?.data ?? 0;
}

export async function deleteNotification(id: number): Promise<boolean> {
  const res = await api.delete(`/api/Notifications/${id}`);
  return res.data?.success ?? true;
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return `Hôm qua, ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

