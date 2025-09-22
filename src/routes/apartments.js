// src/routes/apartments.js
const express = require("express");
const router = express.Router();
const apartmentsController = require("../controllers/apartmentsController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes for fetching apartment listings
router.get("/", apartmentsController.getAllApartments);
router.get("/:id", apartmentsController.getApartmentById);

// Protected routes that require seller authentication
router.post(
  "/",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  apartmentsController.createApartment
);
router.put(
  "/:id",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  apartmentsController.updateApartment
);
router.delete(
  "/:id",
  authMiddleware.isAuthenticated,
  authMiddleware.isSeller,
  apartmentsController.deleteApartment
);

module.exports = router;
