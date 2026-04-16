import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";

const ChatContext = createContext();

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

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

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

    socketRef.current.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socketRef.current.on("typing", ({ chatId, userId, userName }) => {
      setTypingUsers((prev) => ({ ...prev, [chatId]: { userId, userName } }));
    });

    socketRef.current.on("stop-typing", ({ chatId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[chatId];
        return next;
      });
    });

    socketRef.current.on("message-received", (newMessage) => {
      const chatId = newMessage.chat._id || newMessage.chat;
      if (activeChatRef.current && activeChatRef.current._id === chatId) {
        setMessages((prev) => [...prev, newMessage]);
        // Mark as read
        api.put(`/messages/read/${chatId}`).catch(() => {});
        socketRef.current.emit("message-read", { chatId, userId: user._id });
      } else {
        toast(`💬 New message from ${newMessage.sender.name}`, { icon: "🔔" });
      }
      // Update chat list latest message
      setChats((prev) =>
        prev.map((c) => c._id === chatId ? { ...c, latestMessage: newMessage } : c)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
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

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const { data } = await api.get("/chats");
      setChats(data);
    } catch (err) {
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
