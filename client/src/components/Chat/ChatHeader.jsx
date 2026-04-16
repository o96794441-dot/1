import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { getChatName, getChatAvatar, getOtherUser } from "../Sidebar/ChatListItem";

export default function ChatHeader({ onInfoClick, onBack }) {
  const { user } = useAuth();
  const { activeChat, onlineUsers, typingUsers } = useChat();

  // ── Handle Android hardware back button ─────────────────
  useEffect(() => {
    if (!onBack || !activeChat) return;

    // Push a fake state so hardware back goes here first
    window.history.pushState({ chatOpen: true }, "");

    const handlePopState = (e) => {
      onBack(); // Go back to sidebar instead of browser history
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeChat, onBack]);

  if (!activeChat) return null;

  const name = getChatName(activeChat, user._id);
  const avatar = getChatAvatar(activeChat, user._id);
  const otherUser = getOtherUser(activeChat, user._id);
  const isOnline = !activeChat.isGroupChat && otherUser && onlineUsers.has(otherUser._id);
  const isTyping = typingUsers[activeChat._id];
  const memberCount = activeChat.users?.length;

  const statusText = () => {
    if (isTyping) return "typing...";
    if (activeChat.isGroupChat) return `${memberCount} members`;
    if (isOnline) return "online";
    return "offline";
  };

  return (
    <div className="chat-header">
      {/* ← Back button — visible on mobile only via CSS */}
      <button
        className="mobile-back-btn"
        onClick={onBack}
        title="Back"
        aria-label="Back to chats"
      >
        ←
      </button>

      <div className="avatar-wrap">
        {activeChat.isGroupChat ? (
          <div className="avatar-group">👥</div>
        ) : (
          <img
            className="avatar"
            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
            alt={name}
          />
        )}
        {isOnline && <div className="online-dot" />}
      </div>

      <div className="chat-header-info">
        <div className="chat-header-name">{name}</div>
        <div className={`chat-header-status ${isOnline || isTyping ? "online" : ""}`}>
          {statusText()}
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        <button className="icon-btn" title="Info" onClick={onInfoClick}>ℹ️</button>
      </div>
    </div>
  );
}
