import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/Auth/LoginPage";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatWindow from "./components/Chat/ChatWindow";
import OnboardingModal from "./components/shared/OnboardingModal";
import "./index.css";

export default function App() {
  const { user, loading } = useAuth();
  const [activeChatId, setActiveChatId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const handleChatSelect = (chat) => {
    setActiveChatId(chat._id);
    setMobileSidebarOpen(false);
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "var(--accent)", secondary: "#000" } },
        }}
      />

      {/* 🎯 Onboarding — shown ONCE after first Google login */}
      {user && !user.onboardingDone && <OnboardingModal />}

      <div className="app-layout">
        <Sidebar
          onChatSelect={handleChatSelect}
          activeChatId={activeChatId}
          className={mobileSidebarOpen ? "" : "hidden"}
        />
        <ChatWindow onBack={() => setMobileSidebarOpen(true)} />
      </div>
    </>
  );
}
