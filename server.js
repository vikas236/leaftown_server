// server.js
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
const { json, urlencoded } = require("express");
const logger = require("./src/utils/logger");
const { Pool } = require("pg");

const authRoutes = require("./src/routes/auth");
const healthRoutes = require("./src/routes/health");
const apartmentsRoutes = require("./src/routes/apartments");
const plotsRoutes = require("./src/routes/plots");
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

/* Basic middlewares */
app.use(helmet());
app.use(xss());
app.use(hpp());
app.use(json({ limit: "10kb" }));
app.use(urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/* CORS - restrict origins in production */
const allowedOrigins = (
  process.env.CORS_ORIGINS || "https://leaftown.vercel.app"
)
  .split(",")
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

/* Rate limiter - basic protection against brute force/DoS */
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

/* CSRF - enable for cookie-based session flows (skip for pure token auth APIs or adjust) */
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
});
// app.use(csrfProtection);

/* Content Security Policy (fine-tune for your assets) */
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  })
);

/* Routes */
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
const secretRoutes = require("./src/routes/secret");
app.use("/api/apartments", apartmentsRoutes);
app.use("/api/plots", plotsRoutes);

/* 404 handler */
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

/* Centralized error handler */
app.use(errorHandler);

/* Start server with graceful shutdown */
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
