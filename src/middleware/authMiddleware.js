const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Missing Authorization header" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = { email: payload.sub };
    next();
  });
};

module.exports = { requireAuth };
