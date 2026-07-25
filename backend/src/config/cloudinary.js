const cloudinary = require('cloudinary').v2;
const env = require('./env');

if (env.isConfigured.cloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

module.exports = cloudinary;
