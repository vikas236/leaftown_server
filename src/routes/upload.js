const express = require("express");
const rateLimit = require("express-rate-limit");
// 1. Import the new deleteImage controller and isAuthenticated middleware
const {
  safeUpload,
  handleUpload,
  deleteImage,
} = require("../controllers/uploadController");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// Rate limiter for upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, message: "Too many uploads, try again later." },
});

// 2. Protect the POST route with isAuthenticated
router.post("/", uploadLimiter, isAuthenticated, safeUpload, handleUpload);

// 3. Add the new DELETE route
router.delete("/:filename", isAuthenticated, deleteImage);

module.exports = router;
