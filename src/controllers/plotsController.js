// src/controllers/plotsController.js
const { validationResult } = require("express-validator");
const { generateCustomID } = require("../utils/idGenerator");

/**
 * Helper to get seller_id from user_id
 */
const getSellerId = async (db, user_id) => {
  const result = await db.query(
    "SELECT seller_id FROM sellers WHERE user_id = $1",
    [user_id]
  );
  return result.rows.length > 0 ? result.rows[0].seller_id : null;
};

exports.createPlot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user_id = req.user.sub; // This is user_id from JWT
    const db = req.app.locals.db;

    // Verify Seller & Get ID
    const seller_id = await getSellerId(db, user_id);
    if (!seller_id) {
      return res
        .status(403)
        .json({ error: "You are not a registered seller." });
    }

    const {
      project_id, // Link to Venture/Township
      plot_number,
      location,
      facing,
      area_sq_yards, // Input in Sq Yards
      price,
      bank_loan_available,
    } = req.body;

    // Logic: Convert Yards to Feet for DB storage if needed, or store both
    // 1 Sq Yard = 9 Sq Ft
    const size_sqft = area_sq_yards ? area_sq_yards * 9 : 0;
    const plot_display_id = generateCustomID("PLT");

    const newPlot = await db.query(
      `INSERT INTO open_plots (
          project_id, seller_id, plot_display_id, plot_number, location, 
          facing, area_sq_yards, size_sqft, price, status, bank_loan_available, date_listed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Available', $10, NOW())
      RETURNING *`,
      [
        project_id,
        seller_id,
        plot_display_id,
        plot_number,
        location,
        facing,
        area_sq_yards,
        size_sqft,
        price,
        bank_loan_available,
      ]
    );

    res.status(201).json({
      message: "Plot created successfully",
      plot: newPlot.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllPlots = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    // Updated Query: Joins with Projects to show Venture Name
    const allPlots = await db.query(
      `SELECT 
         p.*, 
         prj.project_name,
         COALESCE(json_agg(i.path) FILTER (WHERE i.path IS NOT NULL), '[]') AS images
       FROM open_plots p
       LEFT JOIN projects prj ON p.project_id = prj.project_id
       LEFT JOIN images i ON i.filename = 'plot_' || p.plot_number || '_plots'
       GROUP BY p.plot_id, prj.project_name
       ORDER BY p.date_listed DESC`
    );
    res.json(allPlots.rows);
  } catch (error) {
    next(error);
  }
};

exports.getPlotById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const plot = await db.query(
      `SELECT 
         p.*, 
         prj.project_name,
         COALESCE(json_agg(i.path) FILTER (WHERE i.path IS NOT NULL), '[]') AS images
       FROM open_plots p
       LEFT JOIN projects prj ON p.project_id = prj.project_id
       LEFT JOIN images i ON i.filename = 'plot_' || p.plot_number || '_plots'
       WHERE p.plot_id = $1
       GROUP BY p.plot_id, prj.project_name`,
      [id]
    );

    if (plot.rows.length === 0) {
      return res.status(404).json({ error: "Plot not found" });
    }

    res.json(plot.rows[0]);
  } catch (error) {
    next(error);
  }
};

exports.updatePlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const user_id = req.user.sub;
    const updates = req.body;

    delete updates.images;

    // Verify ownership
    const existingPlot = await db.query(
      `SELECT p.seller_id, s.user_id 
         FROM open_plots p 
         JOIN sellers s ON p.seller_id = s.seller_id 
         WHERE p.plot_id = $1`,
      [id]
    );

    if (existingPlot.rows.length === 0)
      return res.status(404).json({ error: "Plot not found" });

    // Check if the logged-in user matches the seller's user_id
    if (existingPlot.rows[0].user_id !== user_id) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Dynamic SQL generation
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(updates);

    const updatedPlot = await db.query(
      `UPDATE open_plots SET ${setClause} WHERE plot_id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.json({ message: "Plot updated", plot: updatedPlot.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.deletePlot = async (req, res, next) => {
  // ... (Keep your existing delete logic, but ensure you check seller ownership via user_id like in updatePlot)
  const { id } = req.params;
  const db = req.app.locals.db;
  const user_id = req.user.sub;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Verify ownership
    const existingPlot = await client.query(
      `SELECT p.seller_id, p.plot_number, s.user_id 
             FROM open_plots p 
             JOIN sellers s ON p.seller_id = s.seller_id 
             WHERE p.plot_id = $1`,
      [id]
    );

    if (existingPlot.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Plot not found" });
    }

    if (existingPlot.rows[0].user_id !== user_id) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(403).json({ error: "Permission denied" });
    }

    // Delete Logic
    const plotNumber = existingPlot.rows[0].plot_number;
    await client.query("DELETE FROM images WHERE filename = $1", [
      `plot_${plotNumber}_plots`,
    ]);
    await client.query("DELETE FROM open_plots WHERE plot_id = $1", [id]);

    await client.query("COMMIT");
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
