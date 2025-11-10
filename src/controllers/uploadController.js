// src/controllers/uploadController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { fileTypeFromFile } = require("file-type"); // Correct import

/* --- Helper: sanitize filename --- */
const sanitizeFilename = (name) => {
  // Prevent path traversal, unwanted chars, and overly long names
  name = path.basename(name);
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 100);
};

/* --- Multer Storage Configuration --- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve("uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const customName =
      req.body?.name && typeof req.body.name === "string"
        ? sanitizeFilename(req.body.name)
        : "file";
    const uniqueName = `${customName}-${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

/* --- Multer File Filter --- */
const fileFilter = (req, file, cb) => {
  try {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
    const allowedExt = [".jpg", ".jpeg", ".png", ".gif"];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      return cb(
        new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)
      );
    }
  } catch (err) {
    cb(err);
  }
};

/* --- Multer Upload Config --- */
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single("image");

/* --- Safe Middleware Wrapper --- */
exports.safeUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      let message = "File upload error";

      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          message = "File too large. Maximum size is 5MB.";
          break;
        case "LIMIT_UNEXPECTED_FILE":
          message = `Unexpected file field: '${err.field}'. Only 'image' is allowed.`;
          break;
        case "LIMIT_PART_COUNT":
          message = "Too many form parts in upload.";
          break;
        case "LIMIT_FILE_COUNT":
          message = "Too many files uploaded.";
          break;
        case "LIMIT_FIELD_KEY":
          message = "Form field name too long.";
          break;
        case "LIMIT_FIELD_VALUE":
          message = "Form field value too long.";
          break;
      }

      return res.status(400).json({
        success: false,
        error_type: "multer_error",
        error_code: err.code,
        message,
      });
    } else if (err) {
      console.error("Upload middleware error:", err);
      return res.status(500).json({
        success: false,
        error_type: "server_error",
        message: "Internal upload error.",
        details: err.message,
      });
    }

    next();
  });
};

/* --- Upload Controller --- */
exports.handleUpload = async (req, res) => {
  try {
    const db = req.app.locals.db;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error_type: "validation_error",
        message: "No file uploaded or invalid file type.",
      });
    }

    const filePath = req.file.path;
    const detectedType = await fileTypeFromFile(filePath); // Corrected

    // Verify real file signature
    if (
      !detectedType ||
      !["image/jpeg", "image/png", "image/gif"].includes(detectedType.mime)
    ) {
      fs.unlinkSync(filePath); // Delete fake file
      return res.status(400).json({
        success: false,
        error_type: "file_signature_error",
        message: "Uploaded file is not a valid image.",
      });
    }

    const name = req.body?.name || "Unnamed";
    const imageUrl = `/api/uploads/${req.file.filename}`;

    await db.query(
      `INSERT INTO images (filename, path, uploaded_at) VALUES ($1, $2, NOW())`,
      [name, imageUrl]
    );

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully.",
      name,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error("Error in handleUpload function:", err);
    return res.status(500).json({
      success: false,
      error_type: "database_error",
      message: "Failed to save upload info to the database.",
      details: err.message,
    });
  }
};

exports.deleteImage = async (req, res, next) => {
  const { filename } = req.params;
  const db = req.app.locals.db;
  const client = await db.connect();

  try {
    await client.query("BEGIN"); // Start transaction

    // 1. Find the image
    const imageResult = await client.query(
      "SELECT path FROM images WHERE path = $1", // Removed seller_id
      [`/api/uploads/${filename}`]
    );

    if (imageResult.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(404)
        .json({ success: false, message: "Image not found." });
    }

    // 2. Delete the file from the filesystem
    const filePath = path.resolve(__dirname, "..", "uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found, but deleting DB record: ${filePath}`);
    }

    // 3. Delete the record from the database
    await client.query("DELETE FROM images WHERE path = $1", [
      `/api/uploads/${filename}`,
    ]);

    await client.query("COMMIT"); // Commit transaction
    res
      .status(200)
      .json({ success: true, message: "Image deleted successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in deleteImage function:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete image.",
      details: err.message,
    });
  } finally {
    client.release();
  }
};
