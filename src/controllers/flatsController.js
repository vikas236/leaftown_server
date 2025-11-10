// src/controllers/flatsController.js
const { validationResult } = require("express-validator");
const logger = require("../utils/logger"); // Assuming you have a logger

/**
 * Helper function to check if a user is a registered seller.
 * (This function is identical and can be shared)
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
 * Creates a new Flat listing.
 * @route POST /api/flats
 */
exports.createFlat = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const seller_id = req.user.sub;
    const db = req.app.locals.db;

    const isSeller = await isRegisteredSeller(db, seller_id);
    if (!isSeller) {
      return res
        .status(403)
        .json({ error: "You are not a registered seller." });
    }

    // MODIFIED: Extract all fields from the 'flats' table
    const {
      seller_agent_id,
      building_name,
      address,
      locality,
      city,
      pincode,
      flat_number,
      floor,
      total_floors_in_building,
      bedrooms,
      bathrooms,
      balconies,
      carpet_area_sqft,
      super_built_up_area_sqft,
      price,
      status,
      facing,
      is_vastu_compliant,
      furnishing_status,
      property_age_years,
      possession_date,
    } = req.body;

    // Basic validation
    if (
      !building_name ||
      !city ||
      !bedrooms ||
      !super_built_up_area_sqft ||
      !price
    ) {
      return res.status(400).json({
        error:
          "Building name, city, bedrooms, area, and price are required.",
      });
    }

    const newFlat = await db.query(
      `INSERT INTO flats (
          seller_id, seller_agent_id, building_name, address, locality, city, pincode,
          flat_number, floor, total_floors_in_building, bedrooms, bathrooms, balconies,
          carpet_area_sqft, super_built_up_area_sqft, price, status, facing,
          is_vastu_compliant, furnishing_status, property_age_years, possession_date, date_listed
      ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
      )
      RETURNING *`,
      [
        seller_id, // $1
        seller_agent_id || null, // $2
        building_name, // $3
        address || null, // $4
        locality || null, // $5
        city, // $6
        pincode || null, // $7
        flat_number || null, // $8
        floor || null, // $9
        total_floors_in_building || null, // $10
        bedrooms, // $11
        bathrooms || null, // $12
        balconies || 0, // $13
        carpet_area_sqft || null, // $14
        super_built_up_area_sqft, // $15
        price, // $16
        status || "available", // $17
        facing || null, // $18
        is_vastu_compliant || false, // $19
        furnishing_status || "unfurnished", // $20
        property_age_years || 0, // $21
        possession_date || null, // $22
      ]
    );

    res.status(201).json({
      message: "Flat listing created successfully",
      flat: newFlat.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates an existing Flat listing.
 * @route PUT /api/flats/:id
 */
exports.updateFlat = async (req, res, next) => {
  try {
    const { id } = req.params; // This is the flat_id
    const db = req.app.locals.db;
    const seller_id = req.user.sub;
    const updates = req.body;

    // MODIFIED: Remove any fields that should not be updated
    delete updates.flat_id; // Don't allow changing primary key
    delete updates.seller_id; // Don't allow changing owner
    delete updates.date_listed; // Don't allow changing list date

    // Check ownership
    const existingFlat = await db.query(
      "SELECT seller_id FROM flats WHERE flat_id = $1",
      [id]
    );

    if (existingFlat.rows.length === 0) {
      return res.status(404).json({ error: "Flat listing not found" });
    }
    if (existingFlat.rows[0].seller_id !== seller_id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to update this listing" });
    }

    // Build query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");
    const values = Object.values(updates);

    // No valid fields to update
    if (values.length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    const updatedFlat = await db.query(
      `UPDATE flats SET ${setClause} WHERE flat_id = $${
        values.length + 1
      } RETURNING *`,
      [...values, id]
    );

    res.json({
      message: "Flat listing updated successfully",
      flat: updatedFlat.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a Flat listing.
 * @route DELETE /api/flats/:id
 */
exports.deleteFlat = async (req, res, next) => {
  const { id } = req.params; // flat_id
  const db = req.app.locals.db;
  const seller_id = req.user.sub;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 1. Get flat details and verify ownership
    const existingFlat = await client.query(
      "SELECT seller_id, building_name, flat_number FROM flats WHERE flat_id = $1",
      [id]
    );

    if (existingFlat.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ error: "Flat listing not found" });
    }
    if (existingFlat.rows[0].seller_id !== seller_id) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this listing" });
    }

    // 2. Delete associated images
    // MODIFIED: Create a unique image name pattern for the flat
    const { building_name, flat_number } = existingFlat.rows[0];
    const b_name = building_name.replace(/\s+/g, "_");
    const f_num = (flat_number || "").replace(/\s+/g, "_");
    const imageNamePattern = `${b_name}_${f_num}_flat`;

    await client.query("DELETE FROM images WHERE filename LIKE $1", [
      imageNamePattern + "%",
    ]);

    // 3. Delete the flat listing itself.
    await client.query("DELETE FROM flats WHERE flat_id = $1", [id]);

    await client.query("COMMIT");
    res.json({
      message: "Flat listing and all associated data deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Error deleting flat listing:", error);
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Retrieves all Flat listings.
 * @route GET /api/flats
 */
exports.getAllFlats = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    // MODIFIED: Simpler query for flats, but with same image-joining logic
    const query = `
      SELECT
        f.*,
        COALESCE(json_agg(DISTINCT i.path) FILTER (WHERE i.path IS NOT NULL), '[]') AS images
      FROM flats f
      LEFT JOIN images i ON i.filename LIKE 
        REPLACE(f.building_name, ' ', '_') || '_' || 
        COALESCE(REPLACE(f.flat_number, ' ', '_'), '') || '_flat%'
      GROUP BY f.flat_id
      ORDER BY f.date_listed DESC;
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single Flat listing by ID.
 * @route GET /api/flats/:id
 */
exports.getFlatById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;
    // MODIFIED: Same logic as getAllFlats, but filtered by flat_id
    const query = `
      SELECT
        f.*,
        COALESCE(json_agg(DISTINCT i.path) FILTER (WHERE i.path IS NOT NULL), '[]') AS images
      FROM flats f
      LEFT JOIN images i ON i.filename LIKE 
        REPLACE(f.building_name, ' ', '_') || '_' || 
        COALESCE(REPLACE(f.flat_number, ' ', '_'), '') || '_flat%'
      WHERE f.flat_id = $1
      GROUP BY f.flat_id;
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat listing not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};