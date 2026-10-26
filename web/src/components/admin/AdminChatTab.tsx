import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import type {
  ChatMessageItem,
  ChatConversationItem,
  OnDutyStaffItem,
} from "../../lib/chat";
import {
  closeConversation,
  fetchConversationById,
  fetchOnDutyStaff,
  fetchStaffConversations,
  joinConversationGroup,
  leaveConversationGroup,
  markConversationAsRead,
  sendHubMessage,
  sendHubTyping,
  startChatHub,
} from "../../lib/chat";
import {
  SearchIcon,
  RefreshCwIcon,
  ClockIcon,
} from "../Icon";
import { useConfirm } from "../../context/ConfirmContext";

interface Props {
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function AdminChatTab({ onNotify }: Props) {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [conversations, setConversations] = useState<ChatConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [activeConv, setActiveConv] = useState<ChatConversationItem | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Open" | "Closed">("Open");
  const [onDutyStaff, setOnDutyStaff] = useState<OnDutyStaffItem[]>([]);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const selectedConvIdRef = useRef<number | null>(selectedConvId);
  selectedConvIdRef.current = selectedConvId;

  const hasLoadedOnceRef = useRef(false);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Tải danh sách hội thoại
  const loadConversations = useCallback(async (showLoading = false) => {
    try {
      if (showLoading || !hasLoadedOnceRef.current) {
        setLoading(true);
      }
      const data = await fetchStaffConversations({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      setConversations(data);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error("Lỗi tải danh sách hội thoại:", err);
      onNotifyRef.current("Không thể tải danh sách cuộc trò chuyện.", "warning");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Tải nhân viên trực
  useEffect(() => {
    fetchOnDutyStaff()
      .then((data) => setOnDutyStaff(data))
      .catch((err) => console.warn("Lỗi tải nhân viên trực:", err));
  }, []);

  // Tải hội thoại khi filter/search thay đổi
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Kết nối SignalR cho Staff (chỉ chạy 1 lần khi component mount)
  useEffect(() => {
    let hubMounted = true;

    async function initStaffHub() {
      try {
        const hub = await startChatHub();
        if (hub && hubMounted) {
          setIsConnected(true);

          // Nhận tin nhắn mới từ bất kỳ sinh viên nào gửi tới
          hub.off("NewSupportMessage");
          hub.on(
            "NewSupportMessage",
            (data: { conversation: ChatConversationItem; message: ChatMessageItem }) => {
              const curSelId = selectedConvIdRef.current;
              // Cập nhật danh sách conversations
              setConversations((prev) => {
                const existingIndex = prev.findIndex((c) => c.id === data.conversation.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    lastMessageContent: data.message.content,
                    lastMessageTime: data.message.sentAt,
                    status: "Open",
                    unreadCount:
                      curSelId === data.conversation.id
                        ? 0
                        : updated[existingIndex].unreadCount + 1,
                  };
                  return updated;
                }
                return [data.conversation, ...prev];
              });

              // Nếu đang mở đúng conversation này thì append message
              if (curSelId === data.conversation.id) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
                scrollToBottom();
                markConversationAsRead(data.conversation.id).catch(() => {});
              } else {
                onNotifyRef.current(
                  `Tin nhắn mới từ ${data.conversation.userName || "Sinh viên"}: "${data.message.content.slice(0, 30)}..."`,
                  "info"
                );
              }
            }
          );

          // Nhận tin nhắn trực tiếp trong nhóm hội thoại đang xem
          hub.off("ReceiveMessage");
          hub.on("ReceiveMessage", (msg: ChatMessageItem) => {
            const curSelId = selectedConvIdRef.current;
            if (curSelId === msg.chatConversationId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              scrollToBottom();
            }
          });

          // Nhận trạng thái soạn tin
          hub.off("UserTyping");
          hub.on(
            "UserTyping",
            (data: { conversationId: number; isStaff: boolean; isTyping: boolean }) => {
              const curSelId = selectedConvIdRef.current;
              if (curSelId === data.conversationId && !data.isStaff) {
                setIsUserTyping(data.isTyping);
                if (data.isTyping) scrollToBottom();
              }
            }
          );
        }
      } catch (err) {
        console.warn("Lỗi kết nối Staff SignalR:", err);
      }
    }

    initStaffHub();

    return () => {
      hubMounted = false;
    };
  }, [scrollToBottom]);

  // Chọn một conversation để xem chi tiết
  const handleSelectConversation = async (convId: number) => {
    try {
      if (selectedConvId) {
        await leaveConversationGroup(selectedConvId).catch(() => {});
      }

      setSelectedConvId(convId);
      setLoadingConv(true);
      setIsUserTyping(false);

      const conv = await fetchConversationById(convId);
      setActiveConv(conv);
      setMessages(conv.messages || []);

      // Tham gia phòng SignalR của cuộc hội thoại
      await joinConversationGroup(convId);

      // Đánh dấu đã đọc trong state local
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );

      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      console.error("Lỗi chọn cuộc hội thoại:", err);
      onNotify("Không thể mở cuộc trò chuyện này.", "warning");
    } finally {
      setLoadingConv(false);
    }
  };

  // Gửi tin nhắn từ phía nhân viên trực ban
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || !selectedConvId || isSending) return;

    try {
      setIsSending(true);
      if (!customText) {
        setInputText("");
      }

      sendHubTyping(selectedConvId, false).catch(() => {});

      await sendHubMessage(selectedConvId, textToSend);

      // Cập nhật last message trong danh sách bên trái
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                lastMessageContent: textToSend,
                lastMessageTime: new Date().toISOString(),
              }
            : c
        )
      );

      scrollToBottom();
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      onNotify("Gửi tin nhắn thất bại. Vui lòng thử lại.", "warning");
    } finally {
      setIsSending(false);
    }
  };

  // Đóng phiên hỗ trợ
  const handleCloseConversation = async () => {
    if (!selectedConvId) return;
    const isConfirmed = await confirm({
      title: "Xác nhận đóng phiên hỗ trợ",
      message: "Bạn có chắc chắn muốn đóng phiên hỗ trợ này không?",
      subMessage: "Phiên hỗ trợ sẽ chuyển sang trạng thái Đã đóng và sinh viên sẽ nhận được thông báo kết thúc.",
      confirmText: "Đóng phiên hỗ trợ",
      cancelText: "Tiếp tục hỗ trợ",
      type: "warning",
    });
    if (!isConfirmed) return;

    try {
      await closeConversation(selectedConvId);
      onNotify("Đã đóng phiên hỗ trợ thành công.", "success");

      setActiveConv((prev) => (prev ? { ...prev, status: "Closed" } : null));
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConvId ? { ...c, status: "Closed" } : c))
      );
    } catch (err) {
      console.error("Lỗi đóng phiên hỗ trợ:", err);
      onNotify("Không thể đóng phiên hỗ trợ.", "warning");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!selectedConvId) return;

    sendHubTyping(selectedConvId, true).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConvId) {
        sendHubTyping(selectedConvId, false).catch(() => {});
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const activeStaff = onDutyStaff.find((s) => s.isActiveShift) || onDutyStaff[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── TOP KPI / STATUS BAR ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >

        {/* THẺ 2: NHÂN VIÊN ĐANG TRỰC BAN */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              Nhân viên trực ca hôm nay
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
              {user?.fullName || (activeStaff ? activeStaff.fullName : "Thủ thư trực ban")}
            </div>
            <div style={{ fontSize: "11px", color: "#3b82f6", display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
              <ClockIcon size={12} />
              <span>{user ? `Mã: ${user.cardCode} • ${activeStaff?.shiftName || "Trực ban"}` : (activeStaff ? `${activeStaff.shiftName} (${activeStaff.shiftTimeRange})` : "Sẵn sàng hỗ trợ 24/7")}</span>
            </div>
            <div style={{ fontSize: "11px", color: isConnected ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isConnected ? "#10b981" : "#f59e0b" }} />
              <span>{isConnected ? "Kênh SignalR trực tuyến sẵn sàng" : "Đang kết nối SignalR..."}</span>
            </div>
          </div>
        </div>

        {/* THẺ 3: TỔNG QUAN HỘI THOẠI & TIN CHƯA ĐỌC */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "18px 20px",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: totalUnread > 0 ? "#fef2f2" : "#f1f5f9",
              color: totalUnread > 0 ? "#dc2626" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              Yêu cầu hỗ trợ trực tuyến
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
              {conversations.length} cuộc hội thoại
            </div>
            <div style={{ fontSize: "11px", color: totalUnread > 0 ? "#ef4444" : "#10b981", fontWeight: 600, marginTop: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: totalUnread > 0 ? "#ef4444" : "#10b981", display: "inline-block" }} />
              <span>{totalUnread > 0 ? `Có ${totalUnread} tin nhắn mới cần trả lời` : "Đã xử lý tất cả tin nhắn"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: DUAL PANE CHAT CONSOLE ────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: "20px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          minHeight: "640px",
          overflow: "hidden",
        }}
      >
        {/* ── CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI ─────────────────────── */}
        <div
          style={{
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f8fafc",
          }}
        >
          {/* Header tìm kiếm & Lọc */}
          <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                Hộp thư hỗ trợ
              </span>
              <button
                type="button"
                onClick={() => loadConversations(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                  borderRadius: "4px",
                }}
                title="Làm mới danh sách"
              >
                <RefreshCwIcon size={16} />
              </button>
            </div>

            {/* Input Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                placeholder="Tìm theo MSSV, tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 34px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Bộ lọc trạng thái: Đang mở / Tất cả / Đã đóng */}
            <div style={{ display: "flex", gap: "6px" }}>
              {(["Open", "ALL", "Closed"] as const).map((st) => {
                const label = st === "Open" ? "Đang mở" : st === "ALL" ? "Tất cả" : "Đã đóng";
                const isSelected = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isSelected ? "#2563eb" : "#e2e8f0",
                      color: isSelected ? "#ffffff" : "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách các item cuộc trò chuyện */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Đang tải danh sách...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}>
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>Chưa có yêu cầu hỗ trợ nào</div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  Khi sinh viên bấm chat trên web, tin nhắn sẽ hiện tại đây.
                </div>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConvId === c.id;
                const hasUnread = (c.unreadCount || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? "#ffffff"
                        : hasUnread
                        ? "#eff6ff"
                        : "transparent",
                      borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = hasUnread ? "#eff6ff" : "transparent";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                        {c.userName || "Sinh viên"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {c.lastMessageTime
                          ? new Date(c.lastMessageTime).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span
                        style={{
                          backgroundColor: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        {c.userCardCode}
                      </span>
                      {c.departmentName && (
                        <span style={{ fontSize: "11px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.departmentName}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: hasUnread ? "#1e293b" : "#64748b",
                          fontWeight: hasUnread ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "220px",
                        }}
                      >
                        {c.lastMessageContent || "Bắt đầu cuộc trò chuyện..."}
                      </p>

                      {hasUnread && (
                        <span
                          style={{
                            backgroundColor: "#ef4444",
                            color: "#ffffff",
                            borderRadius: "10px",
                            padding: "1px 6px",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CỘT PHẢI: KHUNG CHAT CHI TIẾT ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {!activeConv ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)",
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: "18px", color: "#334155", margin: "0 0 8px 0" }}>
                Bàn trực hỗ trợ Thư viện HUIT
              </h3>
              <p style={{ maxWidth: "420px", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
                Chọn một cuộc trò chuyện từ danh sách bên trái để trao đổi trực tiếp qua SignalR Realtime với Sinh viên hoặc Giảng viên.
              </p>
            </div>
          ) : (
            <>
              {/* TOP HEADER CỦA CONVERSATION */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundColor: "#e0e7ff",
                      color: "#3730a3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "15px",
                    }}
                  >
                    {activeConv.userName ? activeConv.userName.charAt(0) : "U"}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                        {activeConv.userName}
                      </span>
                      <span
                        style={{
                          backgroundColor: activeConv.status === "Open" ? "#dcfce7" : "#f1f5f9",
                          color: activeConv.status === "Open" ? "#15803d" : "#64748b",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: activeConv.status === "Open" ? "#16a34a" : "#94a3b8" }} />
                        {activeConv.status === "Open" ? "Đang mở" : "Đã kết thúc"}
                      </span>
                    </div>

                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", display: "flex", gap: "10px" }}>
                      <span>Mã: <strong>{activeConv.userCardCode}</strong></span>
                      {activeConv.departmentName && <span>Khoa: <strong>{activeConv.departmentName}</strong></span>}
                      {activeConv.userEmail && <span>Email: <strong>{activeConv.userEmail}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* NÚT THAO TÁC */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {activeConv.status === "Open" && (
                    <button
                      type="button"
                      onClick={handleCloseConversation}
                      style={{
                        padding: "7px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Kết thúc hỗ trợ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* KHU VỰC TIN NHẮN */}
              <div
                style={{
                  flex: 1,
                  padding: "20px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundColor: "#f8fafc",
                }}
              >
                {loadingConv ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                    Đang tải tin nhắn...
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.isFromStaff;

                    return (
                      <div
                        key={m.id || `${m.userId}-${m.sentAt}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isStaff ? "flex-end" : "flex-start",
                          gap: "3px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: isStaff ? "#2563eb" : "#475569",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            margin: "0 4px",
                          }}
                        >
                          <span>{m.senderName}</span>
                          {isStaff && (
                            <span
                              style={{
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                              }}
                            >
                              Thủ thư trực
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            maxWidth: "75%",
                            padding: "10px 14px",
                            borderRadius: isStaff
                              ? "14px 14px 2px 14px"
                              : "14px 14px 14px 2px",
                            backgroundColor: isStaff ? "#2563eb" : "#ffffff",
                            color: isStaff ? "#ffffff" : "#0f172a",
                            fontSize: "13px",
                            lineHeight: 1.5,
                            boxShadow: isStaff
                              ? "0 2px 6px rgba(37, 99, 235, 0.25)"
                              : "0 2px 6px rgba(0, 0, 0, 0.05)",
                            border: isStaff ? "none" : "1px solid #e2e8f0",
                            wordBreak: "break-word",
                          }}
                        >
                          {m.content}
                        </div>

                        <span style={{ fontSize: "10px", color: "#94a3b8", margin: "0 4px" }}>
                          {new Date(m.sentAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Trạng thái sinh viên đang gõ */}
                {isUserTyping && (
                  <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", marginLeft: "4px" }}>
                    Sinh viên đang soạn tin...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* KHAY GỢI Ý TRẢ LỜI NHANH (CANNED RESPONSES) */}
              <div
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ffffff",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                }}
              >
                {[
                  "Chào bạn! Mình có thể hỗ trợ gì cho bạn?",
                  "Yêu cầu mượn phòng đã được kiểm tra và duyệt thành công.",
                  "Thiết bị phòng đã được nhân viên kiểm tra đầy đủ.",
                  "Cảm ơn bạn đã liên hệ thư viện HUIT!",
                ].map((quickText) => (
                    <button
                      key={quickText}
                      type="button"
                      onClick={() => handleSendMessage(quickText)}
                      style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: "#334155",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{quickText}</span>
                    </button>
                ))}
              </div>

              {/* THANH NHẬP LIỆU PHẢN HỒI */}
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#ffffff",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <input
                  type="text"
                  placeholder="Nhập nội dung phản hồi... (Nhấn Enter để gửi qua SignalR)"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "20px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isSending}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "20px",
                    backgroundColor: inputText.trim() ? "#2563eb" : "#e2e8f0",
                    color: inputText.trim() ? "#ffffff" : "#94a3b8",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: inputText.trim() ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>Gửi</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
