import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";

// ── Helper: convert base64 VAPID key to Uint8Array ───────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ── Subscribe to Web Push (called after permission granted) ──
export async function subscribeToPushNotifications(token) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const reg = await navigator.serviceWorker.ready;
    const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!VAPID_PUBLIC_KEY) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Send subscription to server
    await fetch(`${import.meta.env.VITE_API_URL}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    console.log("✅ Push subscription saved");
  } catch (err) {
    console.error("Push subscribe error:", err.message);
  }
}

// ── Register Service Worker ───────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("✅ Service Worker registered:", reg.scope))
      .catch((err) => console.error("❌ Service Worker failed:", err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </AuthProvider>
  </StrictMode>
);
