// src/routes/flats.js
const express = require("express");
const router = express.Router();
const flatsController = require("../controllers/flatsController"); // MODIFIED: Import flatsController
const authMiddleware = require("../middleware/authMiddleware");

// Public routes for fetching flat listings
router.get("/", flatsController.getAllFlats); // MODIFIED
router.get("/:id", flatsController.getFlatById); // MODIFIED

// Protected routes that require seller authentication
router.post(
  "/",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  flatsController.createFlat // MODIFIED
);
router.put(
  "/:id",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  flatsController.updateFlat // MODIFIED
);
router.delete(
  "/:id",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  flatsController.deleteFlat // MODIFIED
);

module.exports = router;