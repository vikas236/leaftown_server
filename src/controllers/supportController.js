// src/controllers/supportController.js
const { generateCustomID } = require("../utils/idGenerator");

exports.createTicket = async (req, res) => {
  const db = req.app.locals.db; // Get DB here

  const { subject, message, priority } = req.body;
  const userId = req.user.sub; // User ID from token
  const ticket_display_id = generateCustomID("TKT");

  try {
    const result = await db.query(
      `INSERT INTO support_tickets 
            (ticket_display_id, user_id, subject, message, priority) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
      [ticket_display_id, userId, subject, message, priority || "Medium"]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create ticket" });
  }
};

exports.getMyTickets = async (req, res) => {
  const db = req.app.locals.db; // Get DB here
  const userId = req.user.sub;

  try {
    const result = await db.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};
