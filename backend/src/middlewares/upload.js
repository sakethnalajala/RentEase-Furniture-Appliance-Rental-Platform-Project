const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const env = require('../config/env');

let storage;

if (env.isConfigured.cloudinary) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'rentease', resource_type: 'auto' },
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
