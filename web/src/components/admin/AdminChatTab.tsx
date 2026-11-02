import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { formatRole } from "../../lib/auth";
import type {
  ChatMessageItem,
  ChatConversationItem,
  OnDutyStaffItem,
} from "../../lib/chat";
import {
  closeConversation,
  deleteConversation,
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
  TrashIcon,
  BanIcon,
  ChatIcon,
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
                  const newUnread =
                    curSelId === data.conversation.id
                      ? 0
                      : (data.conversation.unreadCount ?? (updated[existingIndex].unreadCount || 0) + 1);

                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    lastMessageContent: data.message.content,
                    lastMessageTime: data.message.sentAt,
                    status: "Open",
                    unreadCount: newUnread,
                  };
                  return updated;
                }
                return [
                  {
                    ...data.conversation,
                    unreadCount: curSelId === data.conversation.id ? 0 : (data.conversation.unreadCount || 1),
                  },
                  ...prev,
                ];
              });

              // Nếu đang mở đúng conversation này thì append message
              if (curSelId === data.conversation.id) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
                scrollToBottom();
                markConversationAsRead(data.conversation.id).catch(() => { });
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
              if (!msg.isFromStaff) {
                markConversationAsRead(curSelId).catch(() => { });
              }
            }
          });

          // Nhận sự kiện đóng cuộc hội thoại
          hub.off("ConversationClosed");
          hub.on("ConversationClosed", ({ conversationId }: { conversationId: number }) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, status: "Closed" } : c))
            );
            if (selectedConvIdRef.current === conversationId) {
              setActiveConv((prev) => (prev ? { ...prev, status: "Closed" } : null));
            }
          });

          // Nhận sự kiện xóa cuộc hội thoại
          hub.off("ConversationDeleted");
          hub.on("ConversationDeleted", ({ conversationId }: { conversationId: number }) => {
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            if (selectedConvIdRef.current === conversationId) {
              setSelectedConvId(null);
              setActiveConv(null);
              setMessages([]);
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
        await leaveConversationGroup(selectedConvId).catch(() => { });
      }

      setSelectedConvId(convId);
      setLoadingConv(true);
      setIsUserTyping(false);

      const conv = await fetchConversationById(convId);
      setActiveConv(conv);
      setMessages(conv.messages || []);

      // Tham gia phòng SignalR của cuộc hội thoại
      await joinConversationGroup(convId);

      // Đánh dấu đã đọc trên server và trong state local
      markConversationAsRead(convId).catch(() => { });
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

  // Tự động cuộn xuống khi có tin nhắn mới hoặc người dùng đang gõ
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isUserTyping, scrollToBottom]);

  // Gửi tin nhắn từ phía nhân viên trực ban
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || !selectedConvId || isSending) return;
    if (activeConv?.status === "Closed") {
      onNotify("Phiên hỗ trợ này đã kết thúc, không thể gửi tin nhắn.", "warning");
      return;
    }

    try {
      setIsSending(true);
      if (!customText) {
        setInputText("");
      }

      sendHubTyping(selectedConvId, false).catch(() => { });

      const sentMsg = await sendHubMessage(selectedConvId, textToSend);

      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }

      // Cập nhật last message trong danh sách bên trái
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? {
                ...c,
                lastMessageContent: textToSend,
                lastMessageTime: new Date().toISOString(),
                messages: sentMsg
                  ? c.messages?.some((m) => m.id === sentMsg.id)
                    ? c.messages
                    : [...(c.messages || []), sentMsg]
                  : c.messages,
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

  // Xóa toàn bộ cuộc hội thoại (Dành cho Quản lý đơn vị hoặc Quản trị viên)
  const handleDeleteConversation = async (convId: number) => {
    const isConfirmed = await confirm({
      title: "Xác nhận xóa cuộc hội thoại",
      message: "Bạn có chắc chắn muốn xóa toàn bộ cuộc hội thoại này cùng tất cả tin nhắn liên quan?",
      subMessage: "Dữ liệu cuộc hội thoại sẽ bị xóa hoàn toàn khỏi hệ thống và không thể khôi phục.",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy bỏ",
      type: "danger",
    });
    if (!isConfirmed) return;

    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (selectedConvId === convId) {
        setSelectedConvId(null);
        setActiveConv(null);
        setMessages([]);
      }
      onNotify("Đã xóa toàn bộ cuộc hội thoại thành công.", "info");
    } catch (err: any) {
      console.error("Lỗi xóa cuộc hội thoại:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Không thể xóa cuộc hội thoại.";
      onNotify(errorMsg, "warning");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!selectedConvId) return;

    sendHubTyping(selectedConvId, true).catch(() => { });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedConvId) {
        sendHubTyping(selectedConvId, false).catch(() => { });
      }
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const normalizedRole = (user?.role || "").trim().toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "quan-tri" || normalizedRole === "quản trị viên";
  const isManager = normalizedRole === "manager" || normalizedRole === "quan-ly" || normalizedRole === "quản lý" || normalizedRole === "quản lý đơn vị" || normalizedRole === "departmentmanager";
  const isEmployee = normalizedRole === "employee" || normalizedRole === "nhan-vien" || normalizedRole === "nhân viên" || normalizedRole === "thủ thư";
  const canDeleteConversation = isAdmin || isManager || isEmployee;
  const activeStaff = onDutyStaff.find((s) => s.isActiveShift) || onDutyStaff[0];

  function getAvatarColor(role?: string) {
    if (role === "Lecturer") return { bg: "#f3e8ff", text: "#7e22ce" };
    if (role === "Student") return { bg: "#dcfce7", text: "#15803d" };
    if (role === "Manager") return { bg: "#fef3c7", text: "#b45309" };
    return { bg: "#e0e7ff", text: "#3730a3" };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {/* ── TOP COMPACT STATUS STRIP ───────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Bàn trực hỗ trợ Thư viện HUIT
              </span>
            </div>
            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "1px" }}>
              Cán bộ: <strong>{user?.fullName || (activeStaff ? activeStaff.fullName : "Thủ thư trực ban")}</strong> ({user?.cardCode || activeStaff?.code || "TV002"}) • {activeStaff?.shiftName || "Ca trực Thư viện"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => loadConversations(true)}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            title="Làm mới danh sách hội thoại"
          >
            <RefreshCwIcon size={14} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: UNIFIED DUAL PANE CHAT CONSOLE ──────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "calc(100vh - 215px)",
          minHeight: "620px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* ── CỘT TRÁI (340px CỐ ĐỊNH): DANH SÁCH CUỘC HỘI THOẠI ─────────── */}
        <div
          style={{
            width: "340px",
            minWidth: "340px",
            maxWidth: "340px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Header tìm kiếm & Lọc */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc" }}>
            {/* Input Search */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <SearchIcon size={15} />
              </span>
              <input
                type="text"
                placeholder="Tìm theo MSSV, họ tên, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 32px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Bộ lọc trạng thái: Đang mở / Tất cả / Đã đóng */}
            <div style={{ display: "flex", gap: "4px", backgroundColor: "#e2e8f0", padding: "3px", borderRadius: "8px" }}>
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
                      padding: "5px 6px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isSelected ? "#ffffff" : "transparent",
                      color: isSelected ? "#1d4ed8" : "#64748b",
                      fontSize: "11.5px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
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
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Đang tải danh sách hội thoại...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}>
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>Không có cuộc trò chuyện nào</div>
                <div style={{ fontSize: "11.5px", marginTop: "4px" }}>
                  Khi người dùng gửi tin nhắn hỗ trợ, danh sách sẽ hiển thị tại đây.
                </div>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedConvId === c.id;
                const hasUnread = c.status !== "Closed" && (c.unreadCount || 0) > 0;
                const avatarStyle = getAvatarColor(c.userRole);
                const initial = c.userName ? c.userName.charAt(0).toUpperCase() : "U";

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      backgroundColor: isSelected
                        ? "#eff6ff"
                        : hasUnread
                          ? "#f8fafc"
                          : "#ffffff",
                      borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = hasUnread ? "#f8fafc" : "#ffffff";
                      }
                    }}
                  >
                    {/* Avatar circle */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: avatarStyle.bg,
                        color: avatarStyle.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {initial}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                        <span style={{ fontWeight: 700, fontSize: "13px", color: isSelected ? "#1d4ed8" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.userName || "Người dùng"}
                        </span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8", flexShrink: 0, marginLeft: "6px" }}>
                          {c.lastMessageTime
                            ? new Date(c.lastMessageTime).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : ""}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            fontSize: "9.5px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {c.userCardCode}
                        </span>
                        <span
                          style={{
                            backgroundColor:
                              c.userRole === "Lecturer"
                                ? "#f3e8ff"
                                : c.userRole === "Student"
                                ? "#ecfdf5"
                                : "#e0f2fe",
                            color:
                              c.userRole === "Lecturer"
                                ? "#7e22ce"
                                : c.userRole === "Student"
                                ? "#047857"
                                : "#0369a1",
                            fontSize: "9.5px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          {formatRole(c.userRole)}
                        </span>
                        {c.departmentName && (
                          <span style={{ fontSize: "10.5px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                            {c.departmentName}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "11.5px",
                            color: hasUnread ? "#0f172a" : "#64748b",
                            fontWeight: hasUnread ? 600 : 400,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {c.lastMessageContent || "Bắt đầu cuộc trò chuyện..."}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
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
                          {canDeleteConversation && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(c.id);
                              }}
                              title="Xóa cuộc hội thoại này"
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "2px",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                              onMouseEnter={(ev) => (ev.currentTarget.style.color = "#dc2626")}
                              onMouseLeave={(ev) => (ev.currentTarget.style.color = "#94a3b8")}
                            >
                              <TrashIcon size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CỘT PHẢI (FLEX 1): KHUNG CHAT CHI TIẾT ─────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%", backgroundColor: "#f8fafc" }}>
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
                  width: "64px",
                  height: "64px",
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
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#334155", margin: "0 0 6px 0" }}>
                Chưa chọn cuộc trò chuyện
              </h3>
              <p style={{ maxWidth: "380px", fontSize: "12.5px", lineHeight: 1.5, margin: 0, color: "#64748b" }}>
                Vui lòng chọn một cuộc trò chuyện từ danh sách bên trái để xem nội dung và phản hồi trực tiếp cho người dùng.
              </p>
            </div>
          ) : (
            <>
              {/* TOP HEADER CỦA CONVERSATION */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundImage: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "15px",
                      boxShadow: "0 2px 6px rgba(30, 64, 175, 0.25)",
                    }}
                  >
                    {activeConv.userName ? activeConv.userName.charAt(0).toUpperCase() : "U"}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a" }}>
                        {activeConv.userName}
                      </span>
                      <span
                        style={{
                          backgroundColor:
                            activeConv.userRole === "Lecturer"
                              ? "#f3e8ff"
                              : activeConv.userRole === "Student"
                              ? "#ecfdf5"
                              : "#e0f2fe",
                          color:
                            activeConv.userRole === "Lecturer"
                              ? "#7e22ce"
                              : activeConv.userRole === "Student"
                              ? "#047857"
                              : "#0369a1",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "10px",
                        }}
                      >
                        {formatRole(activeConv.userRole)}
                      </span>
                      <span
                        style={{
                          backgroundColor: activeConv.status === "Open" ? "#ecfdf5" : "#f1f5f9",
                          color: activeConv.status === "Open" ? "#15803d" : "#64748b",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: activeConv.status === "Open" ? "#16a34a" : "#94a3b8" }} />
                        {activeConv.status === "Open" ? "Đang mở" : "Đã kết thúc"}
                      </span>
                    </div>

                    <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <span>Mã: <strong>{activeConv.userCardCode}</strong></span>
                      {activeConv.departmentName && <span>Khoa: <strong>{activeConv.departmentName}</strong></span>}
                      {activeConv.userEmail && <span>Email: <strong>{activeConv.userEmail}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* NÚT THAO TÁC */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {activeConv.status === "Open" && (
                    <button
                      type="button"
                      onClick={handleCloseConversation}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Kết thúc hỗ trợ</span>
                    </button>
                  )}

                  {canDeleteConversation && (
                    <button
                      type="button"
                      onClick={() => handleDeleteConversation(activeConv.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#ffffff",
                        color: "#64748b",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        transition: "all 0.15s ease",
                      }}
                      title="Xóa toàn bộ cuộc hội thoại này"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#dc2626";
                        e.currentTarget.style.borderColor = "#fecaca";
                        e.currentTarget.style.backgroundColor = "#fff1f2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      <TrashIcon size={12} />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* KHU VỰC TIN NHẮN */}
              <div
                style={{
                  flex: 1,
                  padding: "20px 24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  backgroundColor: "#f8fafc",
                }}
              >
                {loadingConv ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px", fontSize: "13px" }}>
                    Đang tải lịch sử tin nhắn...
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.isFromStaff;
                    const isMine = isStaff; // Góc nhìn nhân sự: tin nhân sự là của tôi (bên phải)
                    const roleDisplay = isStaff
                      ? m.senderRole === "Admin"
                        ? "Quản trị viên"
                        : m.senderRole === "Manager"
                        ? "Quản lý Thư viện"
                        : "Thủ thư trực"
                      : formatRole(m.senderRole || activeConv?.userRole);

                    const initial = m.senderName ? m.senderName.charAt(0).toUpperCase() : "U";
                    const avatarStyle = getAvatarColor(m.senderRole || activeConv?.userRole);

                    return (
                      <div
                        key={m.id || `${m.userId}-${m.sentAt}`}
                        style={{
                          display: "flex",
                          flexDirection: isMine ? "row-reverse" : "row",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        {/* Avatar tròn */}
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: isMine ? "#1d4ed8" : avatarStyle.bg,
                            color: isMine ? "#ffffff" : avatarStyle.text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "12px",
                            flexShrink: 0,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }}
                        >
                          {isMine ? (user?.fullName?.charAt(0).toUpperCase() || "T") : initial}
                        </div>

                        {/* Nội dung tin nhắn + header */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isMine ? "flex-end" : "flex-start",
                            maxWidth: "70%",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: isMine ? "#1d4ed8" : "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "3px",
                            }}
                          >
                            <span>{isMine ? "Bạn" : m.senderName}</span>
                            <span
                              style={{
                                backgroundColor: isMine
                                  ? "#dbeafe"
                                  : m.senderRole === "Lecturer"
                                  ? "#f3e8ff"
                                  : "#ecfdf5",
                                color: isMine
                                  ? "#1e40af"
                                  : m.senderRole === "Lecturer"
                                  ? "#7e22ce"
                                  : "#047857",
                                fontSize: "9px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontWeight: 600,
                              }}
                            >
                              {roleDisplay}
                            </span>
                          </div>

                          {/* Bong bóng tin nhắn */}
                          <div
                            style={{
                              padding: "10px 15px",
                              borderRadius: isMine
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                              backgroundColor: isMine ? "#1d4ed8" : "#ffffff",
                              backgroundImage: isMine
                                ? "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)"
                                : "none",
                              color: isMine ? "#ffffff" : "#0f172a",
                              fontSize: "13px",
                              lineHeight: 1.5,
                              boxShadow: isMine
                                ? "0 2px 8px rgba(37, 99, 235, 0.25)"
                                : "0 1px 4px rgba(0, 0, 0, 0.05)",
                              border: isMine ? "none" : "1px solid #e2e8f0",
                              wordBreak: "break-word",
                            }}
                          >
                            {m.content}
                          </div>

                          {/* Thời gian gửi */}
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#94a3b8",
                              marginTop: "3px",
                              padding: "0 2px",
                            }}
                          >
                            {new Date(m.sentAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Trạng thái người dùng đang gõ */}
                {isUserTyping && (
                  <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", marginLeft: "42px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ display: "inline-flex", gap: "3px" }}>
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                      <span style={{ width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                    </span>
                    <span>{activeConv?.userRole === "Lecturer" ? "Giảng viên" : "Sinh viên"} đang soạn tin...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* PHIÊN HỖ TRỢ ĐÃ KẾT THÚC: KHÓA CHAT HOÀN TOÀN */}
              {activeConv.status === "Closed" ? (
                <div
                  style={{
                    padding: "16px 20px",
                    backgroundColor: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  <BanIcon size={16} className="text-slate-400" />
                  <span>Phiên hỗ trợ này đã kết thúc. Không thể gửi thêm tin nhắn.</span>
                </div>
              ) : (
                <>
                  {/* KHAY GỢI Ý TRẢ LỜI NHANH (CANNED RESPONSES) */}
                  <div
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "#ffffff",
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      gap: "8px",
                      overflowX: "auto",
                      whiteSpace: "nowrap",
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
                          flexShrink: 0,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#eff6ff";
                          e.currentTarget.style.borderColor = "#bfdbfe";
                          e.currentTarget.style.color = "#1d4ed8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.color = "#334155";
                        }}
                      >
                        <ChatIcon size={13} style={{ flexShrink: 0 }} /> <span>{quickText}</span>
                      </button>
                    ))}
                  </div>

                  {/* THANH NHẬP LIỆU PHẢN HỒI */}
                  <div
                    style={{
                      padding: "12px 18px",
                      backgroundColor: "#ffffff",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Nhập nội dung phản hồi... (Nhấn Enter để gửi)"
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isSending}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "22px",
                        border: "1.5px solid #cbd5e1",
                        fontSize: "13px",
                        outline: "none",
                        transition: "border-color 0.15s ease",
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
                        borderRadius: "22px",
                        backgroundColor: inputText.trim() ? "#1d4ed8" : "#e2e8f0",
                        color: inputText.trim() ? "#ffffff" : "#94a3b8",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: inputText.trim() ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                        boxShadow: inputText.trim() ? "0 2px 6px rgba(29, 78, 216, 0.25)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (inputText.trim()) e.currentTarget.style.backgroundColor = "#1e40af";
                      }}
                      onMouseLeave={(e) => {
                        if (inputText.trim()) e.currentTarget.style.backgroundColor = "#1d4ed8";
                      }}
                    >
                      <span>Gửi</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
