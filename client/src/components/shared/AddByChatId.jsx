import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

/**
 * AddByChatId — lets a user find someone by their 7-digit Chat ID
 * and start a conversation, just like WhatsApp phone numbers.
 */
export default function AddByChatId({ onChatOpened, onClose }) {
  const [chatId, setChatId] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState(false);

  const handleSearch = async () => {
    const id = chatId.replace("#", "").trim();
    if (!id || id.length < 6) { toast.error("Enter a valid 7-digit Chat ID"); return; }
    setSearching(true);
    setFoundUser(null);
    try {
      const { data } = await api.get(`/users/find/${id}`);
      setFoundUser(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "User not found");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!foundUser) return;
    setOpening(true);
    try {
      const { data: chat } = await api.post("/chats", { userId: foundUser._id });
      toast.success(`Chat opened with ${foundUser.name}!`);
      onChatOpened?.(chat);
      onClose?.();
    } catch {
      toast.error("Failed to open chat");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">🆔 Add by Chat ID</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>
          Ask the person to share their <strong style={{ color: "var(--accent)" }}>Chat ID</strong> with you,
          then enter it below to start chatting — just like WhatsApp with phone numbers.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            id="chatid-input"
            className="form-input"
            placeholder="Enter 7-digit Chat ID (e.g. 1234567)"
            value={chatId}
            onChange={(e) => {
              // only allow digits
              setChatId(e.target.value.replace(/[^0-9]/g, "").slice(0, 7));
              setFoundUser(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={7}
            style={{ flex: 1, letterSpacing: "0.1em", fontSize: 18, fontWeight: 700 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={searching || chatId.length < 6}
            style={{ flexShrink: 0, padding: "10px 18px" }}
          >
            {searching ? "..." : "Find"}
          </button>
        </div>

        {/* Found User Card */}
        {foundUser && (
          <div style={{
            background: "var(--bg-input)",
            border: "1px solid rgba(0,230,118,0.2)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
            animation: "fadeIn 0.2s ease",
          }}>
            <img
              src={foundUser.avatar}
              alt={foundUser.name}
              style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid var(--accent)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{foundUser.name}</div>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>
                Chat ID: #{foundUser.chatId}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {foundUser.about}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {foundUser && (
            <button
              id="start-chat-btn"
              className="btn btn-primary"
              onClick={handleStartChat}
              disabled={opening}
            >
              {opening ? "Opening..." : `💬 Chat with ${foundUser.name}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
