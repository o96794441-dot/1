const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, default: "" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    fileUrl: { type: String, default: "" },
    fileType: { type: String, enum: ["image", "video", "document", "audio", ""], default: "" },
    fileName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
