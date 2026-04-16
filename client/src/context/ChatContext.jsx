import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";

const ChatContext = createContext();

// ── Request notification permission ──────────────────────────
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const socketRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const fetchChatsRef = useRef(null);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // ── Fetch chats + unread counts from server ────────────
  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const [{ data: chatData }, { data: counts }] = await Promise.all([
        api.get("/chats"),
        api.get("/messages/unread-counts"),
      ]);
      setChats(chatData);
      setUnreadCounts(counts); // ← load from DB on every startup
    } catch {
      toast.error("Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Keep a ref to fetchChats so socket handler can call it
  useEffect(() => { fetchChatsRef.current = fetchChats; }, [fetchChats]);

  // ── Re-fetch chats when tab becomes visible again ────────
  // This ensures new chats appear when user returns from background
  useEffect(() => {
    if (!token) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchChatsRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [token]);

  // ── Update tab title + App Badge with total unread count ──
  // Works on ALL platforms: Android, iOS, Windows, desktop
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);

    // 1️⃣ Document title — works on ALL browsers/devices
    document.title = total > 0 ? `(${total}) ChatApp` : "ChatApp";

    // 2️⃣ App Badge API — works on Android PWA + Windows Chrome/Edge
    if ("setAppBadge" in navigator) {
      if (total > 0) {
        navigator.setAppBadge(total).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [unreadCounts]);

  // ── Connect socket ───────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected");
      // Re-fetch chats on reconnect — catches any missed messages
      fetchChatsRef.current?.();
    });

    // ✅ Receive full list of online users on connect
    socketRef.current.on("online-users-list", (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    socketRef.current.on("connect_error", (err) =>
      console.error("Socket error:", err.message)
    );

    socketRef.current.on("user-online", ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socketRef.current.on("user-offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev); next.delete(userId); return next;
      });
    });

    socketRef.current.on("typing", ({ chatId, userId, userName }) => {
      setTypingUsers((prev) => ({ ...prev, [chatId]: { userId, userName } }));
    });

    socketRef.current.on("stop-typing", ({ chatId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev }; delete next[chatId]; return next;
      });
    });

    socketRef.current.on("message-received", async (newMessage) => {
      const chatId = newMessage.chat._id || newMessage.chat;
      const isActiveChat = activeChatRef.current?._id === chatId;

      if (isActiveChat) {
        setMessages((prev) => [...prev, newMessage]);
        api.put(`/messages/read/${chatId}`).catch(() => {});
        socketRef.current.emit("message-read", { chatId, userId: user._id });
      } else {
        // 🔴 Increment unread badge count for this chat
        setUnreadCounts((prev) => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
        // 💬 In-app toast notification
        const senderName = newMessage.sender?.name || "Someone";
        const msgPreview = newMessage.content
          ? newMessage.content.slice(0, 80)
          : newMessage.fileUrl ? "📎 Sent a file" : "New message";
        toast(`💬 ${senderName}: ${msgPreview}`, { icon: "🔔", duration: 4000 });
      }

      // Update chat list — move to top with latest message
      setChats((prev) => {
        const exists = prev.some((c) => c._id === chatId);
        if (exists) {
          return prev
            .map((c) => c._id === chatId
              ? { ...c, latestMessage: newMessage, updatedAt: newMessage.createdAt }
              : c
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          // 🆕 New chat not in list — re-fetch entire chat list
          fetchChatsRef.current?.();
          return prev;
        }
      });
    });

    socketRef.current.on("message-read", ({ chatId, readerId }) => {
      if (activeChatRef.current?._id === chatId) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            readBy: m.readBy?.includes(readerId) ? m.readBy : [...(m.readBy || []), readerId],
          }))
        );
      }
    });

    return () => { socketRef.current?.disconnect(); };
  }, [token]);

  const openChat = useCallback(async (chat) => {
    // Clear unread count when opening a chat
    setUnreadCounts((prev) => { const next={...prev}; delete next[chat._id]; return next; });
    if (activeChatRef.current) {
      socketRef.current?.emit("leave-chat", activeChatRef.current._id);
    }
    setActiveChat(chat);
    socketRef.current?.emit("join-chat", chat._id);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/messages/${chat._id}`);
      setMessages(data);
      await api.put(`/messages/read/${chat._id}`);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(async (content, fileUrl = "", fileType = "", fileName = "") => {
    if (!activeChat) return;
    try {
      const { data: msg } = await api.post("/messages", {
        content, chatId: activeChat._id, fileUrl, fileType, fileName
      });
      setMessages((prev) => [...prev, msg]);
      setChats((prev) =>
        prev.map((c) => c._id === activeChat._id
          ? { ...c, latestMessage: msg, updatedAt: msg.createdAt }
          : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      socketRef.current?.emit("new-message", msg);
      return msg;
    } catch {
      toast.error("Failed to send message");
    }
  }, [activeChat]);

  const emitTyping = useCallback((chatId) => {
    socketRef.current?.emit("typing", { chatId });
  }, []);

  const emitStopTyping = useCallback((chatId) => {
    socketRef.current?.emit("stop-typing", { chatId });
  }, []);

  return (
    <ChatContext.Provider value={{
      chats, setChats, activeChat, setActiveChat, messages, setMessages,
      typingUsers, onlineUsers, loadingChats, loadingMessages,
      fetchChats, openChat, sendMessage, emitTyping, emitStopTyping,
      socket: socketRef.current, notifPermission, setNotifPermission,
      requestNotificationPermission, unreadCounts,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
