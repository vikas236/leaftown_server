const rateLimit = require('express-rate-limit');

const createLimiter = (opts = {}) => rateLimit({
  windowMs: opts.windowMs || 15 * 60 * 1000,
  max: opts.max || 100,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { createLimiter };
