const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/auth");
const { sendMessage, getMessages, markAsRead, uploadFile } = require("../controllers/messageController");

const upload = multer({ dest: "uploads/" });

router.post("/", protect, sendMessage);
router.get("/:chatId", protect, getMessages);
router.put("/read/:chatId", protect, markAsRead);
router.post("/upload", protect, upload.single("file"), uploadFile);

module.exports = router;
