const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const env = require('../config/env');
const logger = require('../utils/logger');

let storage;

if (env.isConfigured.cloudinary) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'rentease', resource_type: 'auto' },
  });
} else if (env.nodeEnv === 'production') {
  // Serverless filesystems (Vercel included) are read-only outside os.tmpdir(), and tmpdir
  // itself is ephemeral and never publicly servable — so without Cloudinary configured,
  // uploaded files cannot actually persist or be retrieved in production. Writing here still
  // lets the upload request complete instead of crashing the whole module (and therefore every
  // route that imports it) on a filesystem write it has no permission for, but the resulting
  // URL will 404. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET to make uploads actually work.
  logger.warn('Cloudinary is not configured in production — uploaded files will not persist. Set CLOUDINARY_* env vars.');
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
} else {
  // Dev-mode fallback: store locally so uploads still work without a Cloudinary account.
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — accommodates maintenance/damage videos
});

module.exports = upload;
