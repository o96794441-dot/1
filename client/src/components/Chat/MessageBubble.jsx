import { format, parseISO } from "date-fns";
import { useAuth } from "../../context/AuthContext";

export default function MessageBubble({ message, showSenderName = false }) {
  const { user } = useAuth();
  const isOwn = message.sender?._id === user._id || message.sender === user._id;
  const isRead = message.readBy?.length > 1;

  const timeStr = message.createdAt
    ? format(typeof message.createdAt === "string" ? parseISO(message.createdAt) : message.createdAt, "HH:mm")
    : "";

  return (
    <div className={`message-wrap ${isOwn ? "outgoing" : "incoming"}`}>
      {showSenderName && !isOwn && (
        <div className="message-sender-name">{message.sender?.name}</div>
      )}
      <div className="bubble">
        {/* Image */}
        {message.fileUrl && message.fileType === "image" && (
          <img
            className="bubble-image"
            src={message.fileUrl}
            alt="shared"
            onClick={() => window.open(message.fileUrl, "_blank")}
          />
        )}

        {/* Document / other file */}
        {message.fileUrl && message.fileType !== "image" && (
          <a className="bubble-file" href={message.fileUrl} target="_blank" rel="noreferrer">
            📎 {message.fileName || "File"}
          </a>
        )}

        {/* Text */}
        {message.content && <span>{message.content}</span>}

        {/* Footer */}
        <div className="bubble-footer">
          <span className="bubble-time">{timeStr}</span>
          {isOwn && (
            <span className={`read-tick ${isRead ? "read" : ""}`}>
              {isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
