const qrcode = require('qrcode');
const bwipjs = require('bwip-js');

// Shared by seed.js, vendorOnboardingService.js, and admin.controller.js's product-creation
// endpoint — every Product in this app gets one real, genuinely-scannable QR code + barcode
// per InventoryItem unit, not a placeholder image.
async function generateInventoryAssets(sku) {
  const serialNumber = `SN-${sku}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const [qrCodeUrl, barcodeBuffer] = await Promise.all([
    qrcode.toDataURL(serialNumber),
    bwipjs.toBuffer({ bcid: 'code128', text: sku.slice(0, 40), scale: 2, height: 10, includetext: true, textxalign: 'center' }),
  ]);
  return { serialNumber, qrCodeUrl, barcodeUrl: `data:image/png;base64,${barcodeBuffer.toString('base64')}` };
}

module.exports = { generateInventoryAssets };
