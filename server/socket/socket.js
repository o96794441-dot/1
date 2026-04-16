const jwt = require("jsonwebtoken");
const User = require("../models/User");

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select("-__v");
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Update user online status
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit("user-online", { userId });

    // Join personal room
    socket.join(userId);

    // Join a chat room
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`📥 ${socket.user.name} joined chat: ${chatId}`);
    });

    // Leave a chat room
    socket.on("leave-chat", (chatId) => {
      socket.leave(chatId);
    });

    // Typing indicator
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("typing", { chatId, userId, userName: socket.user.name });
    });

    socket.on("stop-typing", ({ chatId }) => {
      socket.to(chatId).emit("stop-typing", { chatId, userId });
    });

    // New message — broadcast to everyone in the chat room except sender
    socket.on("new-message", (message) => {
      const chatId = message.chat._id || message.chat;
      socket.to(chatId).emit("message-received", message);
    });

    // Message read receipt
    socket.on("message-read", ({ chatId, userId: readerId }) => {
      socket.to(chatId).emit("message-read", { chatId, readerId });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      const now = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now });
      socket.broadcast.emit("user-offline", { userId, lastSeen: now });
      console.log(`❌ User disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = setupSocket;
