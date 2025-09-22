// src/routes/plots.js
const express = require("express");
const router = express.Router();
const plotsController = require("../controllers/plotsController");
const { isAuthenticated, isSeller } = require("../middleware/authMiddleware");

// Public routes for fetching plot listings
router.get("/", plotsController.getAllPlots);
router.get("/:id", plotsController.getPlotById);

// Protected routes that require seller authentication
router.post("/", isAuthenticated, isSeller, plotsController.createPlot);
router.put("/:id", isAuthenticated, isSeller, plotsController.updatePlot);
router.delete("/:id", isAuthenticated, isSeller, plotsController.deletePlot);

module.exports = router;
