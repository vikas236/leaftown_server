const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");

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

/* User Registration with Roles */
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
    body("email")
      .if(body("user_type").equals("seller"))
      .notEmpty()
      .withMessage("Email is required for sellers")
      .isEmail()
      .withMessage("Please enter a valid email address"),

    body("address")
      .if(body("user_type").equals("seller"))
      .notEmpty()
      .withMessage("Address is required for sellers"),

    body("rera_id")
      .if(body("user_type").equals("seller"))
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("RERA ID must be a string"),

    body("brokerage_firm_name")
      .if(body("user_type").equals("seller"))
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("Brokerage firm name must be a string"),

    body("agent_license_number")
      .if(body("user_type").equals("seller"))
      .optional({ checkFalsy: true })
      .isString()
      .withMessage("Agent license number must be a string"),
  ],
  authController.register
);

/* Refresh token */
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
