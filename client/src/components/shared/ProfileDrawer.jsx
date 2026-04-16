import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function ProfileDrawer({ onClose }) {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [about, setAbout] = useState(user?.about || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", { name, about });
      updateUser(data);
      toast.success("Profile updated! ✅");
      setEditing(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  const copyChatId = () => {
    navigator.clipboard.writeText(user?.chatId || "");
    toast.success("Chat ID copied! 📋");
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <button className="icon-btn" onClick={onClose}>←</button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>My Profile</h2>
          <button className="icon-btn" onClick={() => setEditing(!editing)} title="Edit">✏️</button>
        </div>

        {/* Avatar + Name */}
        <div style={{
          background: "linear-gradient(135deg, var(--accent-muted), rgba(0,100,255,0.08))",
          padding: "28px 20px 20px",
          textAlign: "center",
        }}>
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
            alt={user?.name}
            style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)", marginBottom: 12, display: "block", margin: "0 auto 12px" }}
          />
          {editing ? (
            <input id="profile-name-input" className="form-input" value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ textAlign: "center", marginBottom: 8, background: "rgba(255,255,255,0.05)" }}
            />
          ) : (
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{user?.name}</div>
          )}
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{user?.email}</div>
        </div>

        {/* 🆔 Chat ID Section — most important for sharing */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            🆔 My Chat ID
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.15)", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", letterSpacing: "0.12em" }}>
                #{user?.chatId}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                Share this ID so others can add you
              </div>
            </div>
            <button
              onClick={copyChatId}
              style={{
                background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)",
                borderRadius: 8, padding: "8px 14px", color: "var(--accent)",
                fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                transition: "all 0.2s",
              }}
            >
              📋 Copy
            </button>
          </div>
        </div>

        {/* About Section */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            About
          </div>
          {editing ? (
            <input id="profile-about-input" className="form-input" value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell something about yourself..."
            />
          ) : (
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
              {user?.about || "Hey there! I am using ChatApp."}
            </div>
          )}
        </div>

        {/* Actions */}
        {editing && (
          <div style={{ padding: "16px 20px", display: "flex", gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
            <button id="save-profile-btn" className="btn btn-primary" style={{ flex: 1 }}
              onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
