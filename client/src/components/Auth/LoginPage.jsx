import { useEffect, useRef, useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success("Welcome! 🎉");
    } catch (err) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">💬</div>
          <h1>ChatApp</h1>
          <p>Real-time messaging, instantly.<br />Connect with anyone, anywhere.</p>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "14px" }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => toast.error("Google login failed")}
              useOneTap
              shape="pill"
              theme="filled_black"
              size="large"
              text="continue_with"
              width="340"
            />
          )}

          <div className="features-list">
            {[
              "Real-time messaging", "Group chats",
              "File & image sharing", "Typing indicators",
              "Read receipts", "Online status",
            ].map((f) => (
              <div className="feature-item" key={f}>
                <div className="feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
