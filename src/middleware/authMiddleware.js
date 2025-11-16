const jwt = require("jsonwebtoken");

const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  // FIX: Use try/catch for synchronous jwt.verify to handle errors
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      sub: payload.sub,
      role: payload.role,
    };
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);

    // FIX: Specifically handle TokenExpiredError
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        expiredAt: err.expiredAt,
      });
    }

    // Handle other verification errors (e.g., invalid signature)
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Default catch-all for other errors
    return res.status(500).json({ error: "Authentication failed" });
  }
};

const isSeller = (req, res, next) => {
  if (req.user && req.user.role === "seller") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Sellers only." });
  }
};

module.exports = { isAuthenticated, isSeller };
