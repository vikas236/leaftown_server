// src/controllers/apartmentsController.js
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
 * Creates a new apartment listing.
 * @route POST /api/apartments
 */
exports.createApartment = async (req, res, next) => {
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

    const {
      name,
      total_blocks,
      location,
      facing,
      floor,
      flat_number,
      sqft,
      bhk,
      furnished_status,
      price,
    } = req.body;

    const newApartment = await db.query(
      `INSERT INTO apartments (
          seller_id, name, total_blocks, location, facing, floor, flat_number, 
          sqft, bhk, furnished_status, price, status, date_listed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'available', NOW())
      RETURNING *`,
      [
        seller_id,
        name,
        total_blocks,
        location,
        facing,
        floor,
        flat_number,
        sqft,
        bhk,
        furnished_status,
        price,
      ]
    );

    res.status(201).json({
      message: "Apartment created successfully",
      apartment: newApartment.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing apartment listing.
 * @route PUT /api/apartments/:id
 */
exports.updateApartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const seller_id = req.user.sub;
    const updates = req.body;

    const existingApartment = await db.query(
      "SELECT seller_id FROM apartments WHERE apartment_id = $1",
      [id]
    );

    if (existingApartment.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }
    if (existingApartment.rows[0].seller_id !== seller_id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to update this listing" });
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(updates);

    const updatedApartment = await db.query(
      `UPDATE apartments SET ${setClause} WHERE apartment_id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.json({
      message: "Apartment updated successfully",
      apartment: updatedApartment.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an apartment listing.
 * @route DELETE /api/apartments/:id
 */
exports.deleteApartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const seller_id = req.user.sub;

    const existingApartment = await db.query(
      "SELECT seller_id FROM apartments WHERE apartment_id = $1",
      [id]
    );

    if (existingApartment.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }
    if (existingApartment.rows[0].seller_id !== seller_id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this listing" });
    }

    await db.query("DELETE FROM apartments WHERE apartment_id = $1", [id]);
    res.json({ message: "Apartment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getAllApartments = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const allApartments = await db.query(
      "SELECT * FROM apartments ORDER BY date_listed DESC"
    );
    res.json(allApartments.rows);
  } catch (error) {
    next(error);
  }
};

exports.getApartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    const apartment = await db.query(
      "SELECT * FROM apartments WHERE apartment_id = $1",
      [id]
    );

    if (apartment.rows.length === 0) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    res.json(apartment.rows[0]);
  } catch (error) {
    next(error);
  }
};
