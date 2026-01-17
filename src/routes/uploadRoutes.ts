import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g. 123456-789.jpg
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Upload Endpoint (Max 5 files)
router.post('/', upload.array('images', 5), (req, res) => {
  if (!req.files) return res.status(400).json({ error: 'No files uploaded' });

  // Generate URLs for the frontend
  const urls = (req.files as Express.Multer.File[]).map(file => {
    return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  });

  res.json({ urls });
});

export default router;
