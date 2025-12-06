const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");

// ✅ Import middleware
const { verifyToken } = require("../middleware/authMiddleware");

/* Send OTP (for existing users) */
router.post(
  "/send-otp",
  [
    body("phone")
      .isMobilePhone("any")
      .withMessage("Please enter a valid phone number"),
  ],
  authController.sendOtp
);

/* Verify OTP & Login */
router.post(
  "/verify-otp",
  [
    body("phone")
      .isMobilePhone("any")
      .withMessage("Please enter a valid phone number"),
    body("otp")
      .isNumeric()
      .withMessage("OTP must be numeric")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
  ],
  authController.verifyOtp
);

/* User Registration */
router.post(
  "/register",
  [
    body("phone")
      .isMobilePhone("any")
      .withMessage("Please enter a valid phone number"),
    body("user_type")
      .isIn(["seller", "buyer"])
      .withMessage("User type must be either 'seller' or 'buyer'"),
    body("user_name")
      .notEmpty()
      .isString()
      .withMessage("User name is required"),
    // Conditional validation for sellers
    body("email").if(body("user_type").equals("seller")).notEmpty().isEmail(),
    body("address").if(body("user_type").equals("seller")).notEmpty(),
  ],
  authController.register
);

/* Refresh token & Logout */
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

/* ✅ NEW ROUTES (Protected) */
router.get("/profile", verifyToken, authController.getProfile);
router.put("/profile", verifyToken, authController.updateProfile);
router.post("/verify", verifyToken, authController.requestVerification);

module.exports = router;
