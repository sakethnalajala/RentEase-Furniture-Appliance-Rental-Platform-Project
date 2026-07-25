const env = require('../config/env');

// multer-storage-cloudinary sets `file.path` to the already-public Cloudinary secure_url; the
// local-disk fallback (see middlewares/upload.js) sets `file.path` to an absolute filesystem
// path instead, which isn't reachable over HTTP — build a real `/uploads/<filename>` URL for
// that case, served statically by app.js.
function buildFileUrl(req, file) {
  if (env.isConfigured.cloudinary) return file.path;
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
}

module.exports = { buildFileUrl };
