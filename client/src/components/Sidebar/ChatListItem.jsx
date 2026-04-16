import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";

export function getChatName(chat, currentUserId) {
  if (chat.isGroupChat) return chat.chatName;
  const other = chat.users?.find((u) => u._id !== currentUserId);
  return other?.name || "Unknown";
}

export function getChatAvatar(chat, currentUserId) {
  if (chat.isGroupChat) return null;
  const other = chat.users?.find((u) => u._id !== currentUserId);
  return other?.avatar || null;
}

export function getOtherUser(chat, currentUserId) {
  return chat.users?.find((u) => u._id !== currentUserId);
}

export function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
}

export function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

export default function ChatListItem({ chat, isActive, onClick }) {
  const { user } = useAuth();
  const { onlineUsers, typingUsers } = useChat();

  const name = getChatName(chat, user._id);
  const avatar = getChatAvatar(chat, user._id);
  const otherUser = getOtherUser(chat, user._id);
  const isOnline = !chat.isGroupChat && otherUser && onlineUsers.has(otherUser._id);
  const isTyping = typingUsers[chat._id];
  const latest = chat.latestMessage;

  const previewText = () => {
    if (isTyping) return "typing...";
    if (!latest) return "No messages yet";
    if (latest.fileUrl) return latest.fileType === "image" ? "📷 Photo" : "📎 File";
    const prefix = latest.sender?._id === user._id ? "You: " : "";
    return prefix + (latest.content || "");
  };

  const time = latest?.createdAt ? formatMsgTime(latest.createdAt) : "";

  return (
    <div
      className={`chat-item ${isActive ? "active" : ""}`}
      onClick={onClick}
      id={`chat-item-${chat._id}`}
    >
      <div className="avatar-wrap">
        {chat.isGroupChat ? (
          <div className="avatar-group">👥</div>
        ) : (
          <img className="avatar" src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} />
        )}
        {isOnline && <div className="online-dot" />}
      </div>

      <div className="chat-item-body">
        <div className="chat-item-top">
          <span className="chat-item-name">{name}</span>
          <span className="chat-item-time">{time}</span>
        </div>
        <div className="chat-item-bottom">
          <span
            className="chat-item-preview"
            style={isTyping ? { color: "var(--accent)", fontStyle: "normal" } : {}}
          >
            {previewText()}
          </span>
        </div>
      </div>
    </div>
  );
}
