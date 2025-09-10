const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");

/* Register */
router.post(
  "/register",
  [body("email").isEmail(), body("password").isLength({ min: 8 })],
  authController.register
);

/* Login */
router.post(
  "/login",
  [body("email").isEmail(), body("password").exists()],
  authController.login
);

/* Refresh token */
router.post("/refresh", authController.refreshToken);

module.exports = router;
