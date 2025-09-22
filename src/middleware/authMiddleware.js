// src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      console.error("JWT verification failed:", err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      sub: payload.sub,
      role: payload.role,
    };
    next();
  });
};

const isSeller = (req, res, next) => {
  if (req.user && req.user.role === "seller") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Sellers only." });
  }
};

module.exports = { isAuthenticated, isSeller };
