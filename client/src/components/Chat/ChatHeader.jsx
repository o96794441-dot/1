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
    window.history.pushState({ chatOpen: true }, "");
    const handlePopState = () => { onBack(); };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeChat, onBack]);

  if (!activeChat) return null;

  const name = getChatName(activeChat, user._id);
  const avatar = getChatAvatar(activeChat, user._id);
  const otherUser = getOtherUser(activeChat, user._id);
  const isOnline = !activeChat.isGroupChat && otherUser && onlineUsers.has(otherUser._id?.toString());
  const isTyping = typingUsers[activeChat._id];
  const memberCount = activeChat.users?.length;

  const statusText = () => {
    if (isTyping) return "typing...";
    if (activeChat.isGroupChat) return `${memberCount} members`;
    if (isOnline) return "online";
    // Show last seen time for offline users
    if (otherUser?.lastSeen) {
      const d = new Date(otherUser.lastSeen);
      const now = new Date();
      const diffMin = Math.floor((now - d) / 60000);
      if (diffMin < 1) return "last seen just now";
      if (diffMin < 60) return `last seen ${diffMin}m ago`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `last seen ${diffH}h ago`;
      return `last seen ${d.toLocaleDateString()}`;
    }
    return "offline";
  };

  return (
    <div className="chat-header" style={{ background: "var(--bg-secondary)", zIndex: 20 }}>

      {/* ← EXIT button — always visible, prominent */}
      <button
        className="back-btn-visible"
        onClick={onBack}
        title="Back to chats"
        aria-label="Back to chats"
      >
        ‹
      </button>

      {/* Avatar */}
      <div className="avatar-wrap" style={{ flexShrink: 0 }}>
        {activeChat.isGroupChat ? (
          <div className="avatar-group">👥</div>
        ) : (
          <img
            className="avatar"
            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
            alt={name}
          />
        )}
        {!activeChat.isGroupChat && (
          <div className={isOnline ? "online-dot" : "offline-dot"} />
        )}
      </div>

      {/* Name + Status */}
      <div className="chat-header-info" style={{ flex: 1, minWidth: 0 }}>
        <div className="chat-header-name" style={{ fontSize: 16, fontWeight: 700 }}>{name}</div>
        <div className={`chat-header-status ${isOnline || isTyping ? "online" : ""}`}>
          {statusText()}
        </div>
      </div>

      {/* Info button */}
      <button className="icon-btn" title="Info" onClick={onInfoClick}>ℹ️</button>
    </div>
  );
}
