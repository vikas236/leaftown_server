const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT Access Token
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // payload contains { sub, role, user_name, etc }
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        expiredAt: err.expiredAt,
      });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Middleware to check if the authenticated user is a Seller
 */
const isSeller = (req, res, next) => {
  if (req.user && req.user.role === "seller") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Sellers only." });
  }
};

module.exports = { verifyToken, isSeller };
