// src/utils/idGenerator.js
const crypto = require("crypto");

const generateCustomID = (prefix) => {
  // Generates a random string like 'PLT-A7B2'
  const randomPart = crypto.randomBytes(2).toString("hex").toUpperCase();
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of time for uniqueness
  return `${prefix}-${timestamp}-${randomPart}`;
};

module.exports = { generateCustomID };
