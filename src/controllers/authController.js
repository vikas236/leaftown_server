const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// In real use: persist users in DB. This is an in-memory stub.
const users = new Map(); // key: email, value: { passwordHash, refreshToken }

const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });
const signRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    if (users.has(email))
      return res.status(409).json({ error: "User already exists" });

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    users.set(email, { passwordHash, refreshToken: null });

    res.status(201).json({ message: "Registered" });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = users.get(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = signAccessToken({ sub: email });
    const refreshToken = signRefreshToken({ sub: email });

    // Store refresh token (rotate on refresh)
    users.set(email, { ...user, refreshToken });

    // Send secure httpOnly cookie for refresh token (recommended)
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

exports.refreshToken = (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) return res.status(401).json({ error: "Invalid refresh token" });
      const email = payload.sub;
      const user = users.get(email);
      if (!user || user.refreshToken !== token)
        return res.status(401).json({ error: "Invalid refresh token" });

      // rotate refresh token
      const newAccess = signAccessToken({ sub: email });
      const newRefresh = signRefreshToken({ sub: email });
      users.set(email, { ...user, refreshToken: newRefresh });

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
