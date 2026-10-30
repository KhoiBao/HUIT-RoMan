import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { api, API_BASE_URL, TOKEN_KEY } from "./api";

export interface ChatMessageItem {
  id: number;
  chatConversationId: number;
  userId: number;
  senderName: string;
  senderCardCode: string;
  senderRole: string;
  isFromStaff: boolean;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface ChatConversationItem {
  id: number;
  userId: number;
  userName: string;
  userCardCode: string;
  userEmail: string;
  departmentName?: string;
  userRole?: string;
  startTime: string;
  endTime?: string;
  status: "Open" | "Closed" | string;
  lastMessageContent?: string;
  lastMessageTime?: string;
  unreadCount: number;
  messages: ChatMessageItem[];
}

export interface OnDutyStaffItem {
  employeeId: number;
  userId: number;
  code: string;
  fullName: string;
  position: string;
  departmentName: string;
  shiftName: string;
  shiftTimeRange: string;
  isActiveShift: boolean;
  isOnline: boolean;
}

export interface SendMessagePayload {
  conversationId: number;
  content: string;
}

// ─────────────────────────────────────────────────────────────────
// SIGNALR CLIENT CONNECTION SINGLETON
// ─────────────────────────────────────────────────────────────────
let hubConnection: HubConnection | null = null;

function getToken(): string {
  return (
    localStorage.getItem(TOKEN_KEY) ??
    sessionStorage.getItem(TOKEN_KEY) ??
    ""
  );
}

export function getChatHubConnection(): HubConnection {
  if (hubConnection) {
    return hubConnection;
  }

  hubConnection = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/chat`, {
      accessTokenFactory: () => getToken(),
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();

  hubConnection.onclose((error) => {
    if (error) {
      console.warn("[SignalR Chat] Kết nối đóng do lỗi:", error);
    }
  });

  const noop = () => {};
  const events = [
    "ConnectedSuccess", "connectedsuccess",
    "JoinedConversation", "joinedconversation",
    "MessagesMarkedAsRead", "messagesmarkedasread",
    "NewSupportMessage", "newsupportmessage",
    "ReceiveMessage", "receivemessage",
    "UserTyping", "usertyping",
    "ConversationClosed", "conversationclosed",
    "ConversationReopened", "conversationreopened",
    "MessageDeleted", "messagedeleted",
    "ErrorMessage", "errormessage",
  ];
  events.forEach((evt) => hubConnection?.on(evt, noop));

  return hubConnection;
}

export async function startChatHub(): Promise<HubConnection | null> {
  const token = getToken();
  if (!token) return null;

  const connection = getChatHubConnection();
  if (connection.state === HubConnectionState.Disconnected) {
    try {
      await connection.start();
      console.log("[SignalR Chat] Kết nối realtime thành công!");
    } catch (err) {
      console.warn("[SignalR Chat] Không thể bắt đầu kết nối:", err);
    }
  }
  return connection;
}

export async function stopChatHub(): Promise<void> {
  if (hubConnection && hubConnection.state !== HubConnectionState.Disconnected) {
    try {
      await hubConnection.stop();
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function joinConversationGroup(conversationId: number): Promise<void> {
  const connection = getChatHubConnection();
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke("JoinConversation", conversationId);
  }
}

export async function leaveConversationGroup(conversationId: number): Promise<void> {
  const connection = getChatHubConnection();
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke("LeaveConversation", conversationId);
  }
}

export async function sendHubMessage(conversationId: number, content: string): Promise<void> {
  const connection = getChatHubConnection();
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke("SendMessage", conversationId, content);
  } else {
    // Fallback qua REST API nếu SignalR chưa sẵn sàng
    await sendChatMessage(conversationId, content);
  }
}

export async function sendHubTyping(conversationId: number, isTyping: boolean): Promise<void> {
  const connection = getChatHubConnection();
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke("SendTyping", conversationId, isTyping);
  }
}

// ─────────────────────────────────────────────────────────────────
// REST API HELPERS
// ─────────────────────────────────────────────────────────────────
export async function fetchMyActiveConversation(initialMessage?: string): Promise<ChatConversationItem> {
  const res = await api.get("/api/Chat/my-active", {
    params: initialMessage ? { initialMessage } : undefined,
  });
  return res.data?.data || res.data;
}

export async function fetchStaffConversations(params?: {
  status?: string;
  search?: string;
}): Promise<ChatConversationItem[]> {
  const res = await api.get("/api/Chat/staff/conversations", { params });
  return res.data?.data || res.data || [];
}

export async function fetchConversationById(id: number): Promise<ChatConversationItem> {
  const res = await api.get(`/api/Chat/conversations/${id}`);
  return res.data?.data || res.data;
}

export async function sendChatMessage(conversationId: number, content: string): Promise<ChatMessageItem> {
  const res = await api.post("/api/Chat/send", { conversationId, content });
  return res.data?.data || res.data;
}

export async function closeConversation(id: number): Promise<boolean> {
  const res = await api.post(`/api/Chat/conversations/${id}/close`);
  return res.data?.success ?? true;
}

export async function markConversationAsRead(id: number): Promise<boolean> {
  const res = await api.post(`/api/Chat/conversations/${id}/read`);
  return res.data?.success ?? true;
}

export async function createNewConversation(params?: {
  initialMessage?: string;
  roomId?: number;
}): Promise<ChatConversationItem> {
  const res = await api.post("/api/Chat/start-new", params ?? {});
  return res.data?.data || res.data;
}

export async function reopenConversation(id: number): Promise<boolean> {
  const res = await api.post(`/api/Chat/conversations/${id}/reopen`);
  return res.data?.success ?? true;
}

export async function deleteChatMessage(messageId: number): Promise<boolean> {
  const res = await api.delete(`/api/Chat/messages/${messageId}`);
  return res.data?.success ?? true;
}

export async function deleteConversation(conversationId: number): Promise<boolean> {
  const res = await api.delete(`/api/Chat/conversations/${conversationId}`);
  return res.data?.success ?? true;
}

export async function fetchOnDutyStaff(
  roomId?: number,
  departmentId?: number
): Promise<OnDutyStaffItem[]> {
  const res = await api.get("/api/Chat/on-duty-staff", {
    params: {
      ...(roomId ? { roomId } : {}),
      ...(departmentId ? { departmentId } : {}),
    },
  });
  return res.data?.data || res.data || [];
}
