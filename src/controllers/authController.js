const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

// --- Helpers ---
const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

/* Register */
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

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
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );
    if (existingUser.rows.length > 0)
      return res.status(409).json({ error: "User exists" });

    // Insert User
    const newUser = await db.query(
      "INSERT INTO users (phone, user_type, user_name) VALUES ($1, $2, $3) RETURNING user_id, user_type",
      [phone, user_type, user_name]
    );

    // Insert Seller Details
    if (user_type === "seller") {
      await db.query(
        `INSERT INTO sellers (user_id, seller_type, seller_name, contact_person, email, address, rera_id, brokerage_firm_name, agent_license_number, verification_status) 
         VALUES ($1, 'individual', $2, $2, $3, $4, $5, $6, $7, 'Pending')`,
        [
          newUser.rows[0].user_id,
          user_name,
          email,
          address,
          rera_id,
          brokerage_firm_name,
          agent_license_number,
        ]
      );
    }

    // Generate OTP (Mock: 000000)
    const otp = "000000";
    await db.query("INSERT INTO otp_tokens (user_id, otp) VALUES ($1, $2)", [
      newUser.rows[0].user_id,
      otp,
    ]);

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    next(err);
  }
};

/* Send OTP */
exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const db = req.app.locals.db;
    const otp = "000000";

    let user = await db.query(
      "SELECT user_id, user_type FROM users WHERE phone = $1",
      [phone]
    );
    if (user.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    await db.query("INSERT INTO otp_tokens (user_id, otp) VALUES ($1, $2)", [
      user.rows[0].user_id,
      otp,
    ]);
    res.json({ message: "OTP sent", user_type: user.rows[0].user_type });
  } catch (err) {
    next(err);
  }
};

/* Verify OTP */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const db = req.app.locals.db;

    const user = await db.query("SELECT * FROM users WHERE phone = $1", [
      phone,
    ]);
    if (user.rows.length === 0)
      return res.status(401).json({ error: "Invalid OTP" });

    const otpRecord = await db.query(
      "SELECT * FROM otp_tokens WHERE user_id = $1 AND otp = $2",
      [user.rows[0].user_id, otp]
    );
    if (otpRecord.rows.length === 0)
      return res.status(401).json({ error: "Invalid OTP" });

    // Create Token Payload
    const payload = {
      sub: user.rows[0].user_id,
      id: user.rows[0].user_id,
      role: user.rows[0].user_type,
      user_name: user.rows[0].user_name,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({
      sub: user.rows[0].user_id,
      role: user.rows[0].user_type,
    });

    await db.query("UPDATE users SET refresh_token = $1 WHERE user_id = $2", [
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
    next(err);
  }
};

/* Refresh Token */
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });
    const db = req.app.locals.db;

    jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
      if (err) return res.status(401).json({ error: "Invalid refresh token" });

      const user = await db.query("SELECT * FROM users WHERE user_id = $1", [
        payload.sub,
      ]);
      if (user.rows.length === 0 || user.rows[0].refresh_token !== token)
        return res.status(401).json({ error: "Invalid refresh token" });

      const newAccess = signAccessToken({
        sub: user.rows[0].user_id,
        id: user.rows[0].user_id,
        role: user.rows[0].user_type,
        user_name: user.rows[0].user_name,
      });
      const newRefresh = signRefreshToken({
        sub: user.rows[0].user_id,
        role: user.rows[0].user_type,
      });

      await db.query("UPDATE users SET refresh_token = $1 WHERE user_id = $2", [
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
    next(err);
  }
};

/* Logout */
exports.logout = (req, res) => {
  res.clearCookie("refreshToken");
  res.status(204).send();
};

/* Update Profile (DEBUGGED) */
exports.updateProfile = async (req, res, next) => {
  console.log("--- [DEBUG] Profile Update Started ---");
  try {
    const user_id = req.user.sub;
    const user_role = req.user.role;
    const db = req.app.locals.db;
    const { bio, address, email, user_name, profile_image_id } = req.body;

    console.log(`[DEBUG] User ID: ${user_id} | Role: ${user_role}`);
    console.log("[DEBUG] Payload received:", {
      bio,
      address,
      email,
      user_name,
      profile_image_id,
    });

    // Update 'users' table
    console.log("[DEBUG] Updating 'users' table...");
    const userUpdateResult = await db.query(
      `UPDATE users SET 
       bio = COALESCE($1, bio), 
       address = COALESCE($2, address), 
       user_name = COALESCE($3, user_name), 
       profile_image_id = COALESCE($4, profile_image_id) 
       WHERE user_id = $5 RETURNING *`,
      [bio, address, user_name, profile_image_id, user_id]
    );
    console.log(
      `[DEBUG] 'users' table updated. Rows affected: ${userUpdateResult.rowCount}`
    );

    // If Seller, update 'sellers' table
    if (user_role === "seller") {
      console.log("[DEBUG] User is Seller. Updating 'sellers' table...");
      const sellerUpdateResult = await db.query(
        `UPDATE sellers SET 
         address = COALESCE($1, address), 
         email = COALESCE($2, email), 
         seller_name = COALESCE($3, seller_name) 
         WHERE user_id = $4 RETURNING *`,
        [address, email, user_name, user_id]
      );
      console.log(
        `[DEBUG] 'sellers' table updated. Rows affected: ${sellerUpdateResult.rowCount}`
      );
    } else {
      console.log(
        "[DEBUG] User is NOT a seller. Skipping 'sellers' table update."
      );
    }

    console.log("--- [DEBUG] Profile Update Completed Successfully ---");
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("--- [DEBUG] ERROR in Profile Update ---", err);
    next(err);
  }
};

/* Request Verification */
exports.requestVerification = async (req, res, next) => {
  try {
    const user_id = req.user.sub;
    const db = req.app.locals.db;
    const { verification_doc_image_id } = req.body;

    if (!verification_doc_image_id) {
      return res.status(400).json({ error: "Document Image ID is required" });
    }

    // Update Users Table
    await db.query(
      `UPDATE users SET verification_doc_image_id = $1, is_verified = false WHERE user_id = $2`,
      [verification_doc_image_id, user_id]
    );

    // If Seller, Update Seller Table
    if (req.user.role === "seller") {
      await db.query(
        `UPDATE sellers SET verification_doc_image_id = $1, verification_status = 'Pending' WHERE user_id = $2`,
        [verification_doc_image_id, user_id]
      );
    }

    res.json({
      message: "Verification requested. Admin will review your details.",
    });
  } catch (err) {
    next(err);
  }
};

/* Get Current Profile */
exports.getProfile = async (req, res, next) => {
  try {
    const user_id = req.user.sub;
    const db = req.app.locals.db;

    // ✅ FIX: Removed 'u.email' and 'u.verification_status' which don't exist
    // We get 'email' and 'verification_status' ONLY from the sellers table
    const result = await db.query(
      `SELECT 
         u.user_id, 
         u.user_name, 
         u.phone, 
         u.user_type, 
         u.bio, 
         u.address as user_address, 
         u.is_verified, 
         
         s.seller_id, 
         s.seller_name, 
         s.email, 
         s.address as seller_address, 
         s.verification_status
       FROM users u
       LEFT JOIN sellers s ON u.user_id = s.user_id
       WHERE u.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];

    // Merge data logic
    const profileData = {
      id: row.user_id,
      // Prefer Seller Name/Address if available, else User Name/Address
      user_name: row.seller_name || row.user_name,
      address: row.seller_address || row.user_address,

      // Email only exists for sellers in your schema
      email: row.email || "",

      phone: row.phone,
      bio: row.bio,
      role: row.user_type,

      // Verification logic
      is_verified: row.is_verified,
      verification_status:
        row.verification_status ||
        (row.is_verified ? "Verified" : "Unverified"),
    };

    res.json({ success: true, data: profileData });
  } catch (err) {
    console.error("Profile Fetch Error:", err); // Added logging
    next(err);
  }
};
