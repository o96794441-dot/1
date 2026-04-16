import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat, requestNotificationPermission } from "../../context/ChatContext";
import ChatListItem from "./ChatListItem";
import GroupModal from "../shared/GroupModal";
import ProfileDrawer from "../shared/ProfileDrawer";
import AdminDashboard from "../Admin/AdminDashboard";
import AddByChatId from "../shared/AddByChatId";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function Sidebar({ onChatSelect, activeChatId }) {
  const { user, logout } = useAuth();
  const { chats, fetchChats, openChat, loadingChats, notifPermission, setNotifPermission } = useChat();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAddById, setShowAddById] = useState(false);
  const searchTimer = useRef(null);

  const handleEnableNotifs = async () => {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") toast.success("🔔 Notifications enabled!");
    else if (result === "denied") toast.error("Notifications blocked. Enable in browser settings.");
  };

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/users?search=${val}`);
        setSearchResults(data);
      } catch { toast.error("Search failed"); }
      finally { setSearching(false); }
    }, 400);
  };

  const handleUserClick = async (userId) => {
    try {
      const { data: chat } = await api.post("/chats", { userId });
      setSearch(""); setSearchResults([]);
      await openChat(chat);
      onChatSelect?.(chat);
    } catch { toast.error("Failed to open chat"); }
  };

  const handleChatClick = async (chat) => {
    await openChat(chat);
    onChatSelect?.(chat);
  };

  const handleChatOpened = async (chat) => {
    await openChat(chat);
    onChatSelect?.(chat);
  };

  return (
    <>
      <div className="sidebar">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">💬</div>
            ChatApp
          </div>
          <div className="sidebar-actions">
            {/* 🛡️ Admin — only for admins */}
            {user?.isAdmin && (
              <button className="icon-btn" title="Admin Dashboard" id="open-admin-btn"
                onClick={() => setShowAdmin(true)} style={{ color: "#00e676" }}>
                🛡️
              </button>
            )}
            {/* 🆔 Add by Chat ID */}
            <button className="icon-btn" title="Add by Chat ID" id="add-by-chatid-btn"
              onClick={() => setShowAddById(true)}>
              🆔
            </button>
            {/* 👥 New Group */}
            <button className="icon-btn" title="New Group" onClick={() => setShowGroupModal(true)}>👥</button>
            {/* 👤 Profile */}
            <button className="icon-btn" title="Profile" onClick={() => setShowProfile(true)}>
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                alt="me"
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
              />
            </button>
            {/* 🔄 Refresh */}
            <button
              className="icon-btn"
              title="Refresh chats"
              onClick={() => { fetchChats(); toast("🔄 Refreshed!", { duration: 1500 }); }}
              style={{ fontSize: 16 }}
            >🔄</button>
            {/* 🚪 Logout */}
            <button className="icon-btn" title="Logout" onClick={logout}>🚪</button>
          </div>
        </div>

        {/* ── My Chat ID bar ───────────────────────────────────── */}
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(0,230,118,0.04)",
            borderBottom: "1px solid rgba(0,230,118,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              My Chat ID
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#00e676", letterSpacing: "0.08em" }}>
              #{user?.chatId}
            </span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(user?.chatId || ""); toast.success("Chat ID copied! 📋"); }}
            style={{
              background: "rgba(0,230,118,0.08)",
              border: "1px solid rgba(0,230,118,0.15)",
              borderRadius: 6,
              padding: "3px 8px",
              color: "#00e676",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            📋 Copy
          </button>
        </div>

        {/* ── 🔔 Notification Banner — always visible ──────────── */}
        {notifPermission !== "unsupported" && (
          <div
            onClick={notifPermission !== "granted" ? handleEnableNotifs : undefined}
            style={{
              padding: "10px 16px",
              background: notifPermission === "granted"
                ? "rgba(0,230,118,0.07)"
                : notifPermission === "denied"
                ? "rgba(239,68,68,0.08)"
                : "rgba(255,180,0,0.08)",
              borderBottom: `1px solid ${
                notifPermission === "granted"
                  ? "rgba(0,230,118,0.15)"
                  : notifPermission === "denied"
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(255,180,0,0.15)"
              }`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: notifPermission !== "granted" ? "pointer" : "default",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: 20 }}>
              {notifPermission === "granted" ? "✅" : notifPermission === "denied" ? "🚫" : "🔔"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: notifPermission === "granted" ? "var(--accent)"
                  : notifPermission === "denied" ? "#ef4444" : "#ffb400"
              }}>
                {notifPermission === "granted"
                  ? "Notifications Enabled"
                  : notifPermission === "denied"
                  ? "Notifications Blocked"
                  : "Enable Notifications"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {notifPermission === "granted"
                  ? "You'll receive alerts like WhatsApp"
                  : notifPermission === "denied"
                  ? "Allow in browser Settings → Site Settings"
                  : "Tap to get message alerts like WhatsApp"}
              </div>
            </div>
            {notifPermission !== "granted" && (
              <span style={{
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                color: notifPermission === "denied" ? "#ef4444" : "#ffb400"
              }}>
                {notifPermission === "denied" ? "Fix →" : "Enable →"}
              </span>
            )}
          </div>
        )}

        {/* ── Search ──────────────────────────────────────────── */}
        <div className="search-box">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or Chat ID..."
              value={search}
              onChange={handleSearch}
              id="search-users-input"
            />
          </div>
        </div>

        {/* ── Search Results ────────────────────────────────────── */}
        {(searchResults.length > 0 || searching) && search && (
          <div className="user-search-results" style={{ margin: "0 16px 8px", borderRadius: 8 }}>
            {searching && <div style={{ padding: 12, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>Searching...</div>}
            {searchResults.map((u) => (
              <div key={u._id} className="user-result-item" onClick={() => handleUserClick(u._id)}>
                <img className="avatar" src={u.avatar} alt={u.name} style={{ width: 36, height: 36 }} />
                <div>
                  <div className="user-result-name">{u.name}</div>
                  <div className="user-result-email">
                    {u.chatId ? `#${u.chatId}` : u.email}
                  </div>
                </div>
              </div>
            ))}
            {!searching && searchResults.length === 0 && (
              <div style={{ padding: 12, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>No users found</div>
            )}
          </div>
        )}

        {/* ── Chat List ────────────────────────────────────────── */}
        <div className="chat-list">
          {loadingChats && (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <div className="spinner" />
            </div>
          )}
          {!loadingChats && chats.length === 0 && (
            <div className="no-chats">
              <div className="no-chats-icon">💬</div>
              <h3>No conversations yet</h3>
              <p>Tap 🆔 to add someone by Chat ID</p>
            </div>
          )}
          {chats.map((chat) => (
            <ChatListItem
              key={chat._id}
              chat={chat}
              isActive={activeChatId === chat._id}
              onClick={() => handleChatClick(chat)}
            />
          ))}
        </div>

        {/* ── Admin quick bar ─────────────────────────────────── */}
        {user?.isAdmin && (
          <div onClick={() => setShowAdmin(true)} style={{
            padding: "10px 16px",
            background: "rgba(0,230,118,0.05)",
            borderTop: "1px solid rgba(0,230,118,0.1)",
            display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", fontSize: 12, color: "#00e676",
            flexShrink: 0, userSelect: "none",
          }}>
            🛡️ <span>Open Admin Dashboard</span>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────── */}
      {showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} onCreated={() => { fetchChats(); setShowGroupModal(false); }} />}
      {showProfile  && <ProfileDrawer onClose={() => setShowProfile(false)} />}
      {showAdmin    && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      {showAddById  && <AddByChatId onChatOpened={handleChatOpened} onClose={() => setShowAddById(false)} />}
    </>
  );
}
