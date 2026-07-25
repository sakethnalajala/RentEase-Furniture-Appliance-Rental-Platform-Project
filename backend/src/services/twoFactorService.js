const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

function generateSecret(userEmail) {
  return speakeasy.generateSecret({ name: `RentEase (${userEmail})`, length: 20 });
}

async function generateQrCodeDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

function verifyToken(secretBase32, token) {
  return speakeasy.totp.verify({ secret: secretBase32, encoding: 'base32', token, window: 1 });
}

module.exports = { generateSecret, generateQrCodeDataUrl, verifyToken };
