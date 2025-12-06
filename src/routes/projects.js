const express = require("express");
const router = express.Router();
const projectsController = require("../controllers/projectsController");
// Assuming you have an authMiddleware that exports verifyToken and isSeller
const { verifyToken, isSeller } = require("../middleware/authMiddleware");

// Create a new Project (Venture/Township) - Sellers only
router.post("/", verifyToken, isSeller, projectsController.createProject);

// Get all Projects - Public
router.get("/", projectsController.getAllProjects);

module.exports = router;
