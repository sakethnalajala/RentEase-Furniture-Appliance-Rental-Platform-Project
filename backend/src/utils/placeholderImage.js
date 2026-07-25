// Generates gradient SVG "product photos" (as data URIs) so seeded demo products have
// distinct, decent-looking, category-correct imagery with zero external network dependency —
// no broken links, no third-party image hosting/licensing to worry about, and no risk of two
// products ever sharing an image (each one is rendered fresh from its own name/brand/index).
const GRADIENT_PAIRS = [
  ['#6366f1', '#f97316'],
  ['#4f46e5', '#fb7185'],
  ['#0ea5e9', '#6366f1'],
  ['#f97316', '#f43f5e'],
  ['#8b5cf6', '#06b6d4'],
  ['#14b8a6', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#6366f1', '#22d3ee'],
  ['#ec4899', '#8b5cf6'],
  ['#10b981', '#3b82f6'],
  ['#d946ef', '#6366f1'],
  ['#0891b2', '#22c55e'],
  ['#f43f5e', '#f59e0b'],
  ['#7c3aed', '#ec4899'],
  ['#059669', '#84cc16'],
  ['#2563eb', '#8b5cf6'],
];

// A small library of simple silhouette glyphs so the image reads as "a bed" / "a fridge" /
// "a sofa" at a glance rather than just a gradient card — matched by keyword against the
// product's subCategory, falling back to a generic rounded-rect glyph.
const GLYPHS = [
  { match: /bed|mattress/i, path: 'M60 230h360v50H60zM90 190h300v40H90zM100 160h60v40h-60zM380 160h60v40h-60z' },
  { match: /sofa|recliner/i, path: 'M80 220h320v40H80zM70 180h30v70H70zM380 180h30v70h-30zM110 190h260v40H110z' },
  { match: /chair/i, path: 'M160 150h20v100h-20zM220 150h20v100h-20zM150 240h100v20H150zM160 130h100v20H160z' },
  { match: /table|desk/i, path: 'M90 190h300v20H90zM110 210h20v70h-20zM370 210h20v70h-20z' },
  { match: /wardrobe|bookshelf|shelf/i, path: 'M120 120h160v220H120zM195 120v220M120 180h160M120 240h160' },
  { match: /tv|television/i, path: 'M110 140h180v120H110zM190 260v20h20v-20z' },
  { match: /refrigerator/i, path: 'M150 100h100v260H150zM150 170h100' },
  { match: /wash|dishwasher/i, path: 'M140 110h120v220H140zM200 220a35 35 0 100-70 35 35 0 000 70z' },
  { match: /air condition/i, path: 'M110 160h180v60H110zM140 220v20M170 220v20M200 220v20M230 220v20M260 220v20' },
  { match: /microwave|oven/i, path: 'M120 150h160v100H120zM290 165h20v70h-20z' },
  { match: /purifier|heater/i, path: 'M175 120h50v200h-50zM160 320h80' },
  { match: /vacuum/i, path: 'M180 130a20 20 0 1140 0 20 20 0 01-40 0zM190 150v130M160 280h60' },
  { match: /cooler|fan/i, path: 'M200 200a50 50 0 1050-50 50 50 0 00-50 50z' },
  { match: /stove|induction|mixer/i, path: 'M130 180h140v70H130zM160 165a10 10 0 1120 0 10 10 0 01-20 0zM220 165a10 10 0 1120 0 10 10 0 01-20 0z' },
  { match: /kitchen|home appliance/i, path: 'M140 120h120v180H140zM200 150a15 15 0 1130 0 15 15 0 01-30 0zM160 220h80' },
];

const DEFAULT_GLYPH = 'M130 130h140v140H130z';

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function pickGlyph(subCategory) {
  const found = GLYPHS.find((g) => g.match.test(subCategory));
  return found ? found.path : DEFAULT_GLYPH;
}

/**
 * @param {number} seedIndex - deterministic index driving color selection (kept unique per product)
 * @param {string} title - shown large (usually the subCategory / product type)
 * @param {string} subtitle - shown smaller (usually the brand)
 * @param {number} variant - 0 = main shot, 1/2 = alternate "angle" shots for the gallery
 */
function productPlaceholderImage(seedIndex, title, subtitle, variant = 0) {
  const [from, to] = GRADIENT_PAIRS[(seedIndex + variant) % GRADIENT_PAIRS.length];
  const rotation = variant === 0 ? 135 : variant === 1 ? 200 : 70;
  const glyph = pickGlyph(title);
  const angleLabel = variant === 0 ? '' : variant === 1 ? 'Side View' : 'Close-up';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${rotation})">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="55%" stop-color="${to}"/>
        <stop offset="100%" stop-color="${from}"/>
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="45%" r="75%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
      </radialGradient>
    </defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <circle cx="540" cy="70" r="90" fill="white" opacity="0.07"/>
    <circle cx="70" cy="410" r="110" fill="white" opacity="0.05"/>
    <g transform="translate(100,60) scale(1.15)" fill="none" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
      <path d="${glyph}"/>
    </g>
    <rect width="640" height="480" fill="url(#vignette)"/>
    <text x="50%" y="82%" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="white" text-anchor="middle" opacity="0.98">${escapeXml(title)}</text>
    <text x="50%" y="89%" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="white" text-anchor="middle" opacity="0.85">${escapeXml(subtitle)}${angleLabel ? ` · ${angleLabel}` : ''}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

module.exports = { productPlaceholderImage };
