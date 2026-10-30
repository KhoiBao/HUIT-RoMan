import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { api } from "../../lib/api";
import { PlusIcon } from "../Icon";
import type {
  ChatMessageItem,
  ChatConversationItem,
  OnDutyStaffItem,
} from "../../lib/chat";
import {
  createNewConversation,
  fetchMyActiveConversation,
  fetchOnDutyStaff,
  joinConversationGroup,
  leaveConversationGroup,
  sendHubMessage,
  sendHubTyping,
  startChatHub,
  stopChatHub,
} from "../../lib/chat";

export function LiveChatWidget() {
  const { user } = useAuth();
  const { alert: confirmAlert } = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState<ChatConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onDutyStaff, setOnDutyStaff] = useState<OnDutyStaffItem[]>([]);
  const [isStaffTyping, setIsStaffTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: number; name: string; roomCode: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isStaff =
    user?.role === "Admin" || user?.role === "Employee" || user?.role === "Manager";
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Tải danh sách phòng để người dùng có thể chọn phòng cần hỗ trợ
  useEffect(() => {
    if (!user || isStaff) return;
    api
      .get("/api/Rooms")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setRooms(list);
      })
      .catch((err) => console.warn("Lỗi tải danh sách phòng:", err));

    const params = new URLSearchParams(window.location.search);
    const rid = params.get("roomId") || params.get("room_id");
    if (rid && !isNaN(Number(rid))) {
      setSelectedRoomId(Number(rid));
    }
  }, [user, isStaff]);

  // Lấy nhân viên / quản lý trực ban của đơn vị quản lý phòng đó trong thời gian hiện tại
  useEffect(() => {
    if (!user || isStaff) {
      setOnDutyStaff([]);
      return;
    }
    fetchOnDutyStaff(selectedRoomId ?? undefined)
      .then((data) => setOnDutyStaff(data))
      .catch((err) => console.warn("Lỗi tải nhân viên trực:", err));
  }, [user, isStaff, selectedRoomId]);

  // Kết nối SignalR khi đã đăng nhập
  useEffect(() => {
    if (!user || isStaff) {
      setConversation(null);
      setMessages([]);
      setInputText("");
      setUnreadCount(0);
      setIsStaffTyping(false);
      setIsConnected(false);
      setIsOpen(false);
      setIsMinimized(false);
      return;
    }

    let active = true;
    let activeConvId: number | null = null;

    setConversation(null);
    setMessages([]);
    setUnreadCount(0);
    setIsStaffTyping(false);
    setIsConnected(false);

    async function initChat() {
      try {
        const hub = await startChatHub();
        if (!active) return;
        if (hub) {
          setIsConnected(true);

          // Nhận tin nhắn mới
          hub.off("ReceiveMessage");
          hub.on("ReceiveMessage", (msg: ChatMessageItem) => {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            // Nếu widget đang đóng và tin nhắn từ nhân viên -> tăng badge chưa đọc
            if (!isOpenRef.current && msg.isFromStaff) {
              setUnreadCount((c) => c + 1);
            }
            scrollToBottom();
          });

          // Nhận trạng thái soạn tin
          hub.off("UserTyping");
          hub.on("UserTyping", (data: { isStaff: boolean; isTyping: boolean }) => {
            if (data.isStaff) {
              setIsStaffTyping(data.isTyping);
              if (data.isTyping) {
                scrollToBottom();
              }
            }
          });

          // Cuộc trò chuyện bị đóng bởi cán bộ
          hub.off("ConversationClosed");
          hub.on("ConversationClosed", () => {
            setConversation((prev) => (prev ? { ...prev, status: "Closed" } : null));
          });

          // Cuộc trò chuyện bị xóa bởi cán bộ quản lý
          hub.off("ConversationDeleted");
          hub.on("ConversationDeleted", () => {
            setConversation(null);
            setMessages([]);
          });

          // Tin nhắn bị xóa bởi cán bộ quản lý
          hub.off("MessageDeleted");
          hub.on("MessageDeleted", (data: { conversationId: number; messageId: number }) => {
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
          });
        }

        // Tải hội thoại hoạt động
        const conv = await fetchMyActiveConversation();
        if (!active) return;
        setConversation(conv);
        setMessages(conv.messages || []);
        activeConvId = conv.id;

        // Tham gia nhóm SignalR của cuộc hội thoại
        await joinConversationGroup(conv.id);
      } catch (err) {
        console.warn("Lỗi khởi tạo Chat:", err);
      }
    }

    initChat();

    return () => {
      active = false;
      if (activeConvId) {
        leaveConversationGroup(activeConvId).catch(() => { });
      }
      // Ngắt kết nối để tài khoản kế tiếp không dùng lại phiên chat cũ.
      stopChatHub().catch(() => { });
    };
  }, [user?.id, isStaff, scrollToBottom]);

  // Tự động cuộn khi mở widget hoặc có tin mới
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || isSending) return;

    if (!user) {
      await confirmAlert({
        title: "Yêu cầu đăng nhập",
        message: "Vui lòng đăng nhập để gửi tin nhắn hỗ trợ trực tuyến.",
        type: "info",
      });
      return;
    }

    // Không cho phép gửi tin nhắn nếu phiên đã đóng
    if (conversation?.status === "Closed") {
      await confirmAlert({
        title: "Phiên hỗ trợ đã kết thúc",
        message:
          "Phiên hỗ trợ trước đó đã kết thúc. Vui lòng bấm '+ Bắt đầu phiên mới' để tiếp tục trò chuyện với cán bộ trực ban.",
        type: "info",
      });
      return;
    }

    try {
      setIsSending(true);
      if (!customText) {
        setInputText("");
      }

      // Dừng báo typing
      if (conversation) {
        sendHubTyping(conversation.id, false).catch(() => { });
      }

      let convId = conversation?.id;
      if (!convId) {
        const newConv = await createNewConversation({
          initialMessage: textToSend,
          roomId: selectedRoomId ?? undefined,
        });
        setConversation(newConv);
        setMessages(newConv.messages || []);
        await joinConversationGroup(newConv.id);
        return;
      }

      await sendHubMessage(convId, textToSend);
      scrollToBottom();
    } catch (err) {
      console.error("Gửi tin nhắn thất bại:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Khởi tạo phiên hỗ trợ mới
  const handleStartNewConversation = async () => {
    try {
      setIsSending(true);
      if (conversation?.id) {
        await leaveConversationGroup(conversation.id).catch(() => { });
      }
      const newConv = await createNewConversation({
        roomId: selectedRoomId ?? undefined,
      });
      setConversation(newConv);
      setMessages(newConv.messages || []);
      await joinConversationGroup(newConv.id);
      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      console.error("Lỗi bắt đầu phiên chat mới:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Báo typing khi gõ phím
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!conversation || conversation.status === "Closed") return;

    sendHubTyping(conversation.id, true).catch(() => { });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (conversation) {
        sendHubTyping(conversation.id, false).catch(() => { });
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // CHỈ HIỂN THỊ VÀ CHAT KHI ĐÃ ĐĂNG NHẬP (ẨN VỚI KHÁCH VÀ NHÂN VIÊN/ADMIN/MANAGER)
  if (!user || isStaff) {
    return null;
  }

  const activeStaff = onDutyStaff.find((s) => s.isActiveShift) || onDutyStaff[0];
  const isClosed = conversation?.status === "Closed";

  return (
    <aside
      aria-label="Khung chat hỗ trợ trực tuyến thư viện HUIT"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        fontFamily: "inherit",
      }}
    >
      {/* NÚT BẤM MỞ WIDGET CHAT NỔI */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="chat-floating-trigger"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            boxShadow:
              "0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 8px 10px -6px rgba(37, 99, 235, 0.3)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
            e.currentTarget.style.boxShadow =
              "0 15px 30px -5px rgba(37, 99, 235, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow =
              "0 10px 25px -5px rgba(37, 99, 235, 0.4)";
          }}
        >
          {/* Biểu tượng chat */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                width: "9px",
                height: "9px",
                backgroundColor: "#22c55e",
                borderRadius: "50%",
                border: "2px solid #ffffff",
              }}
            />
          </div>

          <span className="chat-floating-label">Chat trực ban hỗ trợ</span>

          {unreadCount > 0 && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "2px 7px",
                fontSize: "11px",
                fontWeight: 700,
                boxShadow: "0 2px 5px rgba(239, 68, 68, 0.5)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* KHUNG CỬA SỔ CHAT REALTIME */}
      {isOpen && (
        <div
          style={{
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            height: isMinimized ? "60px" : "550px",
            maxHeight: "calc(100vh - 48px)",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow:
              "0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            transition: "height 0.25s ease-in-out",
          }}
        >
          {/* HEADER CỬA SỔ CHAT */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              color: "#ffffff",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    border: "1.5px solid rgba(255, 255, 255, 0.6)",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: "0",
                    right: "0",
                    width: "10px",
                    height: "10px",
                    backgroundColor: activeStaff?.isActiveShift ? "#22c55e" : "#eab308",
                    borderRadius: "50%",
                    border: "2px solid #ffffff",
                  }}
                  title={
                    activeStaff?.isActiveShift
                      ? "Cán bộ đang trong ca trực"
                      : "Cán bộ thường trực hỗ trợ"
                  }
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "13px",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {activeStaff?.departmentName
                    ? `${activeStaff.departmentName} - Trực ban`
                    : "HUIT - Trực ban hỗ trợ"}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span>
                    {activeStaff
                      ? `${activeStaff.fullName} • ${activeStaff.position || "Cán bộ"} (${activeStaff.shiftTimeRange || activeStaff.shiftName})`
                      : "Sẵn sàng hỗ trợ bạn"}
                  </span>
                </div>
              </div>
            </div>

            {/* CÁC NÚT ĐIỀU KHIỂN HEADER */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              {/* Nút thu nhỏ / mở rộng */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  opacity: 0.85,
                }}
                title={isMinimized ? "Phóng to" : "Thu nhỏ"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {isMinimized ? (
                    <path d="M18 15l-6-6-6 6" />
                  ) : (
                    <path d="M6 9l6 6 6-6" />
                  )}
                </svg>
              </button>

              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  opacity: 0.85,
                }}
                title="Đóng cửa sổ"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* NỘI DUNG CUỘC TRÒ CHUYỆN (KHI KHÔNG BỊ THU NHỎ) */}
          {!isMinimized && (
            <>
              {/* DẢI THÔNG BÁO TRẠNG THÁI REALTIME */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "5px 12px",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: "11px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: isConnected ? "#10b981" : "#f59e0b",
                    }}
                  />
                  {isConnected ? "SignalR Realtime" : "Đang kết nối..."}
                </span>

                <span style={{ color: "#2563eb", fontWeight: 600 }}>
                  {user ? `${user.fullName || user.cardCode}` : "Chưa đăng nhập"}
                </span>
              </div>

              {/* THANH CHỌN PHÒNG ĐỂ ĐIỀU HƯỚNG ĐÚNG ĐƠN VỊ & CÁN BỘ CÓ CA TRỰC */}
              <div
                style={{
                  backgroundColor: "#f1f5f9",
                  padding: "6px 12px",
                  borderBottom: "1px solid #e2e8f0",
                  fontSize: "11px",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  Phòng hỏi:
                </span>
                <select
                  value={selectedRoomId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setSelectedRoomId(val);
                  }}
                  style={{
                    flex: 1,
                    fontSize: "11px",
                    padding: "3px 6px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">(Tất cả / Đơn vị quản lý chung)</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomCode} - {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* KHU VỰC HIỂN THỊ TIN NHẮN */}
              <div
                style={{
                  flex: 1,
                  padding: "14px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  backgroundColor: "#fcfdfe",
                }}
              >
                {/* Lời chào hệ thống */}
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #dbeafe",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#1e40af",
                    lineHeight: 1.5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <strong>Kênh hỗ trợ trực ban HUIT</strong>
                  </div>
                  Bạn có thể hỏi về thủ tục phòng, sự cố thiết bị hoặc lịch trực. Hệ
                  thống sẽ tự động kết nối với cán bộ quản lý đang có ca trực trong khung
                  giờ này.
                </div>

                {/* Các nút gợi ý nhanh nếu ít tin nhắn và phiên chưa đóng */}
                {!isClosed && messages.length < 3 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      margin: "4px 0",
                    }}
                  >
                    {[
                      "Thủ tục mượn phòng nhóm?",
                      "Giờ mở cửa hôm nay?",
                      "Báo hỏng thiết bị phòng",
                      "Lịch trực hôm nay",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        style={{
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "14px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          color: "#334155",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#e2e8f0";
                          e.currentTarget.style.borderColor = "#94a3b8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f1f5f9";
                          e.currentTarget.style.borderColor = "#cbd5e1";
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Danh sách tin nhắn */}
                {messages.map((msg) => {
                  const isMe = user && msg.userId === user.id;

                  return (
                    <div
                      key={msg.id || `${msg.userId}-${msg.sentAt}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isMe ? "flex-end" : "flex-start",
                        gap: "2px",
                      }}
                    >
                      {/* Tên người gửi nếu là tin của đối phương */}
                      {!isMe && (
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            color: msg.isFromStaff ? "#2563eb" : "#475569",
                            marginLeft: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {msg.isFromStaff && (
                            <span
                              style={{
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                fontSize: "9px",
                              }}
                            >
                              Cán bộ trực
                            </span>
                          )}
                          {msg.senderName}
                        </div>
                      )}

                      {/* Bong bóng tin nhắn */}
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "9px 13px",
                          borderRadius: isMe
                            ? "14px 14px 2px 14px"
                            : "14px 14px 14px 2px",
                          backgroundColor: isMe ? "#2563eb" : "#ffffff",
                          color: isMe ? "#ffffff" : "#0f172a",
                          fontSize: "13px",
                          lineHeight: 1.45,
                          boxShadow: isMe
                            ? "0 2px 6px rgba(37, 99, 235, 0.25)"
                            : "0 2px 6px rgba(0, 0, 0, 0.05)",
                          border: isMe ? "none" : "1px solid #e2e8f0",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.content}
                      </div>

                      {/* Thời gian gửi */}
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#94a3b8",
                          margin: "0 4px",
                        }}
                      >
                        {new Date(msg.sentAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })}

                {/* Trạng thái nhân viên đang gõ tin */}
                {isStaffTyping && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      color: "#64748b",
                      fontStyle: "italic",
                    }}
                  >
                    <span>Cán bộ trực đang soạn tin</span>
                    <span style={{ display: "inline-flex", gap: "2px" }}>
                      <span
                        style={{
                          animation: "pulse 1s infinite",
                          width: "4px",
                          height: "4px",
                          backgroundColor: "#94a3b8",
                          borderRadius: "50%",
                        }}
                      />
                      <span
                        style={{
                          animation: "pulse 1s infinite 0.2s",
                          width: "4px",
                          height: "4px",
                          backgroundColor: "#94a3b8",
                          borderRadius: "50%",
                        }}
                      />
                      <span
                        style={{
                          animation: "pulse 1s infinite 0.4s",
                          width: "4px",
                          height: "4px",
                          backgroundColor: "#94a3b8",
                          borderRadius: "50%",
                        }}
                      />
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* KHUNG NHẬP LIỆU HOẶC THÔNG BÁO PHIÊN ĐÃ ĐÓNG */}
              {isClosed ? (
                <div
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "#fff7ed",
                    borderTop: "1px solid #fed7aa",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#c2410c",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Phiên hỗ trợ này đã kết thúc</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#7c2d12", lineHeight: 1.4 }}>
                    Phiên hỗ trợ đã đóng nên bạn không thể gửi thêm tin nhắn. Bấm nút bên
                    dưới để kết nối với cán bộ trực trong phiên mới.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartNewConversation}
                    disabled={isSending}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    <PlusIcon size={14} />
                    <span>+ Bắt đầu phiên mới</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: "10px 12px",
                    backgroundColor: "#ffffff",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    placeholder={
                      user
                        ? "Nhập tin nhắn hỗ trợ... (Enter để gửi)"
                        : "Vui lòng đăng nhập để gửi tin..."
                    }
                    disabled={!user || isSending}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "20px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!user || !inputText.trim() || isSending}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor:
                        inputText.trim() && user ? "#2563eb" : "#e2e8f0",
                      color: inputText.trim() && user ? "#ffffff" : "#94a3b8",
                      border: "none",
                      cursor: inputText.trim() && user ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    title="Gửi tin nhắn"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}