// src/controllers/plotsController.js
const { validationResult } = require("express-validator");

/**
 * Helper function to check if a user is a registered seller.
 * This function adds a layer of data-level validation.
 */
const isRegisteredSeller = async (db, user_id) => {
  try {
    const sellerResult = await db.query(
      "SELECT seller_id FROM sellers WHERE user_id = $1",
      [user_id]
    );
    return sellerResult.rows.length > 0;
  } catch (err) {
    throw new Error("Database query failed during seller check.");
  }
};

/**
 * Creates a new open plot listing.
 * @route POST /api/plots
 */
exports.createPlot = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const seller_id = req.user.sub;
    const db = req.app.locals.db;

    // New check: Verify that the user ID exists in the sellers table.
    const isSeller = await isRegisteredSeller(db, seller_id);
    if (!isSeller) {
      return res
        .status(403)
        .json({ error: "You are not a registered seller." });
    }

    const { plot_number, location, facing, size_sqft, price } = req.body;

    const newPlot = await db.query(
      `INSERT INTO open_plots (
          seller_id, plot_number, location, facing, size_sqft, price, 
          status, date_listed
      ) VALUES ($1, $2, $3, $4, $5, $6, 'available', NOW())
      RETURNING *`,
      [seller_id, plot_number, location, facing, size_sqft, price]
    );

    res.status(201).json({
      message: "Plot created successfully",
      plot: newPlot.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all open plot listings.
 * @route GET /api/plots
 */
exports.getAllPlots = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const allPlots = await db.query(
      "SELECT * FROM open_plots ORDER BY date_listed DESC"
    );
    res.json(allPlots.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single open plot listing by its ID.
 * @route GET /api/plots/:id
 */
exports.getPlotById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const plot = await db.query("SELECT * FROM open_plots WHERE plot_id = $1", [
      id,
    ]);

    if (plot.rows.length === 0) {
      return res.status(404).json({ error: "Plot not found" });
    }

    res.json(plot.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing open plot listing.
 * @route PUT /api/plots/:id
 */
exports.updatePlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const seller_id = req.user.sub;
    const updates = req.body;

    const existingPlot = await db.query(
      "SELECT seller_id FROM open_plots WHERE plot_id = $1",
      [id]
    );

    if (existingPlot.rows.length === 0) {
      return res.status(404).json({ error: "Plot not found" });
    }
    if (existingPlot.rows[0].seller_id !== seller_id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to update this listing" });
    }

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

    res.json({
      message: "Plot updated successfully",
      plot: updatedPlot.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an open plot listing.
 * @route DELETE /api/plots/:id
 */
exports.deletePlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const seller_id = req.user.sub;

    const existingPlot = await db.query(
      "SELECT seller_id FROM open_plots WHERE plot_id = $1",
      [id]
    );

    if (existingPlot.rows.length === 0) {
      return res.status(404).json({ error: "Plot not found" });
    }
    if (existingPlot.rows[0].seller_id !== seller_id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this listing" });
    }

    await db.query("DELETE FROM open_plots WHERE plot_id = $1", [id]);
    res.json({ message: "Plot deleted successfully" });
  } catch (error) {
    next(error);
  }
};
