require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const morgan = require("morgan");
const xss = require("xss-clean");
const hpp = require("hpp");
const path = require("path");
const fs = require("fs");
const { json, urlencoded } = require("express");
const logger = require("./src/utils/logger");
const { Pool } = require("pg");

const authRoutes = require("./src/routes/auth");
const healthRoutes = require("./src/routes/health");
const flatsRoutes = require("./src/routes/flats");
const plotsRoutes = require("./src/routes/plots");
const uploadRoutes = require("./src/routes/upload");
const { errorHandler } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE INITIALIZATION ---
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

pool
  .connect()
  .then((client) => {
    logger.info("Database connection established successfully.");
    client.release();
  })
  .catch((err) => {
    logger.error("Failed to connect to the database:", err.message);
    process.exit(1);
  });

app.locals.db = pool;
// --- END DATABASE INITIALIZATION ---

// --- PROXY FIX ---
// FIX: Trust the first proxy hop (e.g., AWS ELB, Nginx)
// This tells Express to trust the X-Forwarded-For header.
// MUST be set before any rate limiters or IP-dependent middleware.
app.set("trust proxy", 1);
// --- END PROXY FIX ---

/* --- BASIC MIDDLEWARES --- */
app.use(
  helmet({
    // Conditionally disable HSTS in development
    hsts: process.env.NODE_ENV === "production",
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(helmet.permittedCrossDomainPolicies());
app.use(xss());
app.use(hpp());
app.use(json({ limit: "10kb" }));
app.use(urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req, res) => req.path.includes("/health"),
  })
);

/* --- CORS CONFIGURATION --- */
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .filter(Boolean);

if (!allowedOrigins.length && process.env.NODE_ENV === "production") {
  logger.error("CORS_ORIGINS missing in production! Exiting.");
  process.exit(1);
}
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);

/* --- GLOBAL RATE LIMITER --- */
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  // 'trust proxy' setting in Express will be used automatically
});
app.use("/api/", apiLimiter);

/* --- UPLOAD RATE LIMITER --- */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 uploads per minute per IP
  message: { success: false, message: "Too many uploads, try again later." },
});
app.use("/api/upload", uploadLimiter);

/* --- CSRF PROTECTION (cookie-based sessions) --- */
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});
// Uncomment if using cookie-based auth
// app.use(csrfProtection);

/* --- CONTENT SECURITY POLICY --- */
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

/* --- ROUTES --- */
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/flats", flatsRoutes);
app.use("/api/plots", plotsRoutes);
app.use("/api/upload", uploadRoutes);

/* --- SAFE FILE SERVING --- */
const UPLOAD_DIR = path.resolve(__dirname, "uploads");
app.get("/api/uploads/:filename", async (req, res) => {
  try {
    // Prevent path traversal
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found." });
    }

    // Serve file safely
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  } catch (err) {
    logger.error("Error serving file:", err);
    res.status(500).json({ success: false, message: "Failed to serve file." });
  }
});

/* --- 404 HANDLER --- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

/* --- CENTRALIZED ERROR HANDLER --- */
app.use(errorHandler);

/* --- START SERVER WITH GRACEFUL SHUTDOWN --- */
const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received: closing server");
  server.close(() => {
    logger.info("Server closed");
    pool.end(() => {
      logger.info("Database connection pool closed");
      process.exit(0);
    });
  });
});

module.exports = app;
