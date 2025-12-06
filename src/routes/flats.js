const express = require("express");
const router = express.Router();
const flatsController = require("../controllers/flatsController");
const { validationResult } = require("express-validator");

// 🔴 OLD/WRONG IMPORT causing the crash:
// const { isAuthenticated } = require('../middleware/authMiddleware');

// ✅ NEW/CORRECT IMPORT:
const { verifyToken, isSeller } = require("../middleware/authMiddleware");

// Input validation middleware (optional, but good practice if you have it)
// const validateFlat = [ ... ];

/* --- ROUTES --- */

// Create a Flat (Sellers only)
// This was likely line 12 crashing because 'verifyToken' or 'isSeller' was undefined
router.post("/", verifyToken, isSeller, flatsController.createFlat);

// Get all Flats (Public)
router.get("/", flatsController.getAllFlats);

// Get Flat by ID (Public)
router.get("/:id", flatsController.getFlatById);

// Update Flat (Sellers only)
router.put("/:id", verifyToken, isSeller, flatsController.updateFlat);

// Delete Flat (Sellers only)
router.delete("/:id", verifyToken, isSeller, flatsController.deleteFlat);

module.exports = router;
