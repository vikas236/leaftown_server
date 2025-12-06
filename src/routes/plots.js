const express = require("express");
const router = express.Router();
const plotsController = require("../controllers/plotsController");
// ✅ FIX: Import 'verifyToken' instead of 'isAuthenticated'
const { verifyToken, isSeller } = require("../middleware/authMiddleware");
const { body } = require("express-validator");

// Optional: Validation rules (you can keep yours if you had them)
const plotValidation = [
  body("plot_number").notEmpty().withMessage("Plot number is required"),
  body("price").isNumeric().withMessage("Price must be a number"),
  // Add other validations as needed
];

// --- ROUTES ---

// Create a Plot (Sellers only)
// 🔴 This was crashing because verifyToken/isSeller were undefined
router.post(
  "/",
  verifyToken,
  isSeller,
  plotValidation,
  plotsController.createPlot
);

// Get all Plots (Public)
router.get("/", plotsController.getAllPlots);

// Get single Plot (Public)
router.get("/:id", plotsController.getPlotById);

// Update Plot (Sellers only)
router.put("/:id", verifyToken, isSeller, plotsController.updatePlot);

// Delete Plot (Sellers only)
router.delete("/:id", verifyToken, isSeller, plotsController.deletePlot);

module.exports = router;
