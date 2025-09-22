const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/authMiddleware");

// A protected route
router.get("/", isAuthenticated, (req, res) => {
  res.json({
    message: `Hello ${
      req.user.name || "User"
    }, you accessed a protected route!`,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
