const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  safeUpload,
  handleUpload,
  deleteImage,
} = require("../controllers/uploadController");

// ✅ FIX: Import 'verifyToken' instead of 'isAuthenticated'
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: "Too many uploads, try again later." },
});

// ✅ FIX: Use 'verifyToken' here
router.post("/", uploadLimiter, verifyToken, safeUpload, handleUpload);

// ✅ FIX: Use 'verifyToken' here
router.delete("/:filename", verifyToken, deleteImage);

module.exports = router;
