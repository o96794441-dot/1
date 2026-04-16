import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function OnboardingModal() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name?.includes("@") ? "" : user?.name || "");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your name (at least 2 characters)");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", {
        name: name.trim(),
        about: about.trim() || "Hey there! I am using ChatApp.",
        onboardingDone: true,
      });
      updateUser({ ...data, onboardingDone: true });
      toast.success("Welcome to ChatApp! 🎉");
    } catch {
      toast.error("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.9)",
      backdropFilter: "blur(8px)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#111827",
        border: "1px solid rgba(0,230,118,0.2)",
        borderRadius: 24,
        padding: 40,
        width: "100%",
        maxWidth: 440,
        textAlign: "center",
        boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(0,230,118,0.1)",
        animation: "fadeInUp 0.4s ease",
      }}>
        {/* Icon */}
        <div style={{ fontSize: 60, marginBottom: 16 }}>👋</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e8ecf0", marginBottom: 8 }}>
          Welcome to ChatApp!
        </h2>
        <p style={{ color: "#8a9bb0", fontSize: 14, marginBottom: 32 }}>
          Set your display name so others can find you.<br />
          Your unique <strong style={{ color: "#00e676" }}>Chat ID</strong> is ready —
          share it to receive messages.
        </p>

        {/* Chat ID Display */}
        <div style={{
          background: "rgba(0,230,118,0.07)",
          border: "1px solid rgba(0,230,118,0.2)",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              Your Chat ID
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#00e676", letterSpacing: "0.1em" }}>
              #{user?.chatId}
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user?.chatId || "");
              toast.success("Chat ID copied!");
            }}
            style={{
              background: "rgba(0,230,118,0.1)",
              border: "1px solid rgba(0,230,118,0.2)",
              borderRadius: 8,
              padding: "8px 14px",
              color: "#00e676",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            📋 Copy
          </button>
        </div>

        {/* Name Input */}
        <div style={{ marginBottom: 16, textAlign: "left" }}>
          <label style={{ display: "block", fontSize: 12, color: "#4a5568", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Display Name *
          </label>
          <input
            id="onboarding-name-input"
            className="form-input"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            maxLength={40}
          />
        </div>

        {/* About Input */}
        <div style={{ marginBottom: 28, textAlign: "left" }}>
          <label style={{ display: "block", fontSize: 12, color: "#4a5568", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            About (optional)
          </label>
          <input
            id="onboarding-about-input"
            className="form-input"
            placeholder="Hey there! I am using ChatApp."
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={80}
          />
        </div>

        <button
          id="onboarding-save-btn"
          className="btn btn-primary"
          style={{ width: "100%", padding: "14px", fontSize: 16, borderRadius: 12 }}
          onClick={handleSave}
          disabled={saving || name.trim().length < 2}
        >
          {saving ? "Saving..." : "Let's go! 🚀"}
        </button>
      </div>
    </div>
  );
}
