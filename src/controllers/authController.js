const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

/* New: User Registration */
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      phone,
      user_type,
      user_name,
      email,
      address,
      rera_id,
      brokerage_firm_name,
      agent_license_number,
    } = req.body;
    const db = req.app.locals.db;

    const existingUser = await db.query(
      "SELECT * FROM Users WHERE phone = $1",
      [phone]
    );
    if (existingUser.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "User with this phone number already exists" });
    }

    const newUser = await db.query(
      "INSERT INTO Users (phone, user_type, user_name) VALUES ($1, $2, $3) RETURNING user_id, user_type",
      [phone, user_type, user_name]
    );

    if (user_type === "seller") {
      await db.query(
        `INSERT INTO Sellers (
            user_id,
            seller_type,
            seller_name,
            contact_person,
            email,
            address,
            rera_id,
            brokerage_firm_name,
            agent_license_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newUser.rows[0].user_id,
          "individual",
          user_name,
          user_name,
          email,
          address,
          rera_id,
          brokerage_firm_name,
          agent_license_number,
        ]
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await db.query("INSERT INTO Otp_Tokens (user_id, otp) VALUES ($1, $2)", [
      newUser.rows[0].user_id,
      otp,
    ]);

    res.status(201).json({ message: "User registered and OTP sent." });
  } catch (err) {
    console.error("Error in register function:", err);
    next(err);
  }
};

/* Send OTP */
exports.sendOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone } = req.body;
    const db = req.app.locals.db;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let user = await db.query(
      "SELECT user_id, user_type FROM Users WHERE phone = $1",
      [phone]
    );

    if (user.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found. Please register." });
    }

    await db.query("INSERT INTO Otp_Tokens (user_id, otp) VALUES ($1, $2)", [
      user.rows[0].user_id,
      otp,
    ]);

    // Log the OTP for debugging purposes
    console.log(`OTP for ${phone} is: ${otp}`);

    res.json({
      message: "OTP sent successfully",
      user_type: user.rows[0].user_type,
    });
  } catch (err) {
    console.error("Error in sendOtp function:", err);
    next(err);
  }
};

/* Verify OTP & issue tokens */
exports.verifyOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, otp } = req.body;
    const db = req.app.locals.db;

    // Modified to select user_name
    const user = await db.query("SELECT * FROM Users WHERE phone = $1", [
      phone,
    ]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    const otpRecord = await db.query(
      "SELECT * FROM Otp_Tokens WHERE user_id = $1 AND otp = $2",
      [user.rows[0].user_id, otp]
    );
    if (otpRecord.rows.length === 0) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    const accessToken = signAccessToken({
      sub: user.rows[0].user_id,
      role: user.rows[0].user_type,
      user_name: user.rows[0].user_name,
    });
    const refreshToken = signRefreshToken({
      sub: user.rows[0].user_id,
      role: user.rows[0].user_type,
    });

    await db.query("UPDATE Users SET refresh_token = $1 WHERE user_id = $2", [
      refreshToken,
      user.rows[0].user_id,
    ]);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken });
  } catch (err) {
    console.error("Error in verifyOtp function:", err);
    next(err);
  }
};

/* Refresh token */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: "No refresh token" });
    }
    const db = req.app.locals.db;

    jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
      if (err) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      const userId = payload.sub;
      // Modified to select user_name
      const user = await db.query("SELECT * FROM Users WHERE user_id = $1", [
        userId,
      ]);

      if (user.rows.length === 0 || user.rows[0].refresh_token !== token) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      const newAccess = signAccessToken({
        sub: user.rows[0].user_id,
        role: user.rows[0].user_type,
        user_name: user.rows[0].user_name,
      });
      const newRefresh = signRefreshToken({
        sub: user.rows[0].user_id,
        role: user.rows[0].user_type,
      });

      await db.query("UPDATE Users SET refresh_token = $1 WHERE user_id = $2", [
        newRefresh,
        user.rows[0].user_id,
      ]);

      res.cookie("refreshToken", newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ accessToken: newAccess });
    });
  } catch (err) {
    console.error("Error in refreshToken function:", err);
    next(err);
  }
};
