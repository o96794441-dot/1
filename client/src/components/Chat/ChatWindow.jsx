import { useEffect, useRef, useState, useCallback } from "react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import { formatDateSeparator } from "../Sidebar/ChatListItem";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function ChatWindow({ onBack }) {
  const { user } = useAuth();
  const { activeChat, messages, loadingMessages, sendMessage, emitTyping, emitStopTyping, typingUsers } = useChat();
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  const handleSend = async () => {
    if ((!text.trim() && !uploadFile) || !activeChat) return;
    emitStopTyping(activeChat._id);

    if (uploadFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", uploadFile);
        const { data } = await api.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        await sendMessage(text.trim(), data.url, data.fileType === "image" ? "image" : "document", uploadFile.name);
        setUploadFile(null);
        setText("");
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      await sendMessage(text.trim());
      setText("");
    }
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    if (!activeChat) return;
    emitTyping(activeChat._id);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitStopTyping(activeChat._id), 1500);
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploadFile(file);
    e.target.value = "";
  };

  // Group messages by date for separators
  const messageGroups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateStr = msg.createdAt ? formatDateSeparator(msg.createdAt) : null;
    if (dateStr && dateStr !== lastDate) {
      messageGroups.push({ type: "separator", label: dateStr });
      lastDate = dateStr;
    }
    messageGroups.push({ type: "message", data: msg });
  });

  const isTyping = activeChat && typingUsers[activeChat._id];

  if (!activeChat) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
          <div className="big-icon">💬</div>
          <h2>Welcome to ChatApp</h2>
          <p>Select a conversation or search for someone to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window" style={{ position: "relative" }}>
      <ChatHeader onBack={onBack} />

      <div className="messages-area" id="messages-area">
        {loadingMessages && (
          <div className="messages-loading"><div className="spinner" /></div>
        )}

        {!loadingMessages && messageGroups.map((item, i) =>
          item.type === "separator" ? (
            <div className="date-separator" key={`sep-${i}`}>
              <span>{item.label}</span>
            </div>
          ) : (
            <MessageBubble
              key={item.data._id || i}
              message={item.data}
              showSenderName={activeChat.isGroupChat}
            />
          )
        )}

        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload preview */}
      {uploadFile && (
        <div className="upload-preview">
          📎 {uploadFile.name}
          <button
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 16 }}
            onClick={() => setUploadFile(null)}
          >✕</button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="emoji-picker-container">
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            width={300}
            height={380}
          />
        </div>
      )}

      {/* Input Bar */}
      <div className="message-input-bar">
        <div className="input-actions">
          <button className="icon-btn" onClick={() => setShowEmoji((p) => !p)} title="Emoji">😊</button>
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.zip"
            style={{ display: "none" }}
            onChange={handleFileChange}
            id="file-upload-input"
          />
        </div>

        <div className="message-input-wrap">
          <textarea
            ref={textareaRef}
            className="message-textarea"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            rows={1}
            id="message-input"
          />
        </div>

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={(!text.trim() && !uploadFile) || uploading}
          id="send-message-btn"
        >
          {uploading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : "➤"}
        </button>
      </div>
    </div>
  );
}
