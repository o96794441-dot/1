const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const { sendMessage, getMessages, markAsRead, uploadFile, getUnreadCounts } = require("../controllers/messageController");

const upload = multer({ dest: "uploads/" });

router.get("/unread-counts", protect, getUnreadCounts);   // ← must be before /:chatId
router.post("/", protect, sendMessage);
router.get("/:chatId", protect, getMessages);
router.put("/read/:chatId", protect, markAsRead);
router.post("/upload", protect, upload.single("file"), uploadFile);

module.exports = router;
