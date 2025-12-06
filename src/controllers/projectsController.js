// src/controllers/projectsController.js
const { generateCustomID } = require("../utils/idGenerator");

exports.createProject = async (req, res) => {
  // 1. Get DB from app locals
  const db = req.app.locals.db;

  const {
    project_name,
    project_type,
    total_area_acres,
    description,
    address,
    bank_loan_available,
  } = req.body;

  // Get seller_id from the token (req.user is set by verifyToken middleware)
  // We need to look up the actual seller_id from the sellers table using the user_id
  const user_id = req.user.sub;

  try {
    // Find seller_id
    const sellerRes = await db.query(
      "SELECT seller_id FROM sellers WHERE user_id = $1",
      [user_id]
    );
    if (sellerRes.rows.length === 0) {
      return res.status(403).json({ error: "Seller profile not found" });
    }
    const seller_id = sellerRes.rows[0].seller_id;

    const project_display_id = generateCustomID("PRJ");

    const result = await db.query(
      `INSERT INTO projects 
            (seller_id, project_display_id, project_name, project_type, total_area_acres, description, address, bank_loan_available) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
      [
        seller_id,
        project_display_id,
        project_name,
        project_type,
        total_area_acres,
        description,
        address,
        bank_loan_available,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

exports.getAllProjects = async (req, res) => {
  const db = req.app.locals.db; // Get DB here
  try {
    const result = await db.query(
      "SELECT * FROM projects ORDER BY created_at DESC"
    );
    res
      .status(200)
      .json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
