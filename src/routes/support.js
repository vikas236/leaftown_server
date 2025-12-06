const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { verifyToken } = require("../middleware/authMiddleware");

// Create a ticket - Any logged in user
router.post("/", verifyToken, supportController.createTicket);

// Get my tickets - Any logged in user
router.get("/", verifyToken, supportController.getMyTickets);

module.exports = router;
