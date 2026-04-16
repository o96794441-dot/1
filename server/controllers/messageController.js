const Message = require("../models/Message");
const Chat = require("../models/Chat");
const cloudinary = require("../config/cloudinary");
const { sendPushToUsers } = require("./pushController");

// @route POST /api/messages
const sendMessage = async (req, res) => {
  const { content, chatId, fileUrl, fileType, fileName } = req.body;
  if (!chatId) return res.status(400).json({ message: "chatId required" });
  if (!content && !fileUrl) return res.status(400).json({ message: "content or file required" });

  const message = await Message.create({
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    fileUrl: fileUrl || "",
    fileType: fileType || "",
    fileName: fileName || "",
    readBy: [req.user._id],
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

  const fullMsg = await Message.findById(message._id)
    .populate("sender", "name avatar email")
    .populate({ path: "chat", populate: { path: "users", select: "_id" } });

  // 🔔 Send Web Push to all other chat members (works even when browser is closed)
  try {
    const otherUserIds = fullMsg.chat.users
      .map((u) => u._id)
      .filter((id) => id.toString() !== req.user._id.toString());

    if (otherUserIds.length > 0) {
      const preview = fullMsg.content
        ? fullMsg.content.slice(0, 80)
        : fullMsg.fileUrl ? "📎 Sent a file" : "New message";

      await sendPushToUsers(otherUserIds, {
        title: req.user.name,
        body: preview,
        icon: req.user.avatar || "/icon-192.png",
        badge: "/icon-192.png",
        tag: `chat-${chatId}`,
        data: { chatId },
      });
    }
  } catch (pushErr) {
    console.error("Push notification error:", pushErr.message);
  }

  res.status(201).json(fullMsg);
};

// @route GET /api/messages/:chatId
const getMessages = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name avatar email")
    .populate("chat")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  res.json(messages.reverse());
};

// @route PUT /api/messages/read/:chatId
const markAsRead = async (req, res) => {
  await Message.updateMany(
    { chat: req.params.chatId, readBy: { $ne: req.user._id } },
    { $push: { readBy: req.user._id } }
  );
  res.json({ message: "Marked as read" });
};

// @route GET /api/messages/unread-counts
// Returns { chatId: unreadCount } for the current user
const getUnreadCounts = async (req, res) => {
  const userId = req.user._id;
  const counts = await Message.aggregate([
    { $match: { sender: { $ne: userId }, readBy: { $ne: userId } } },
    { $group: { _id: "$chat", count: { $sum: 1 } } },
  ]);
  const result = {};
  counts.forEach(({ _id, count }) => { result[_id.toString()] = count; });
  res.json(result);
};

// @route POST /api/messages/upload
const uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "chatapp",
    });
    res.json({ url: result.secure_url, fileType: result.resource_type });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};

module.exports = { sendMessage, getMessages, markAsRead, uploadFile, getUnreadCounts };
