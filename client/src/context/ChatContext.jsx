import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";

const ChatContext = createContext();

// ── Browser notification helper ───────────────────────────────
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title, body, icon) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body,
        icon: icon || "/favicon.svg",
        badge: "/favicon.svg",
        tag: "chatapp-msg",
        renotify: true,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }
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
  const socketRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const chatsRef = useRef(chats);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  // Request notification permission when user logs in
  useEffect(() => {
    if (user) requestNotificationPermission();
  }, [user]);

  // Connect socket when logged in
  useEffect(() => {
    if (!token) return;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(SOCKET_URL, { auth: { token } });

    socketRef.current.on("connect", () => console.log("✅ Socket connected"));
    socketRef.current.on("connect_error", (err) => console.error("Socket error:", err.message));

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
      setTypingUsers((prev) => { const next = { ...prev }; delete next[chatId]; return next; });
    });

    socketRef.current.on("message-received", (newMessage) => {
      const chatId = newMessage.chat._id || newMessage.chat;
      const isActiveChat = activeChatRef.current?._id === chatId;

      // Add message to view if this chat is open
      if (isActiveChat) {
        setMessages((prev) => [...prev, newMessage]);
        api.put(`/messages/read/${chatId}`).catch(() => {});
        socketRef.current.emit("message-read", { chatId, userId: user._id });
      } else {
        // 🔔 Show browser notification + toast for background messages
        const senderName = newMessage.sender?.name || "Someone";
        const msgPreview = newMessage.content
          ? newMessage.content.slice(0, 60)
          : newMessage.fileUrl ? "📎 Sent a file" : "New message";

        showBrowserNotification(senderName, msgPreview, newMessage.sender?.avatar);
        toast(`💬 ${senderName}: ${msgPreview}`, {
          icon: "🔔",
          duration: 4000,
          style: { cursor: "pointer" },
        });
      }

      // Update chat list — move to top with latest message
      setChats((prev) => {
        const existingIdx = prev.findIndex((c) => c._id === chatId);
        if (existingIdx !== -1) {
          // Existing chat — update and sort to top
          const updated = prev.map((c) =>
            c._id === chatId ? { ...c, latestMessage: newMessage, updatedAt: newMessage.createdAt } : c
          );
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          // 🆕 NEW chat not in list — fetch it and add to top
          api.get(`/chats`).then(({ data }) => {
            setChats(data);
          }).catch(() => {});
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

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get("/chats");
      setChats(data);
    } catch {
      toast.error("Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const openChat = useCallback(async (chat) => {
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
        prev.map((c) => c._id === activeChat._id ? { ...c, latestMessage: msg, updatedAt: msg.createdAt } : c)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
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
      fetchChats, openChat, sendMessage, emitTyping, emitStopTyping, socket: socketRef.current
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
