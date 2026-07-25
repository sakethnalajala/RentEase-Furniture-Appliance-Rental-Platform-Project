// Seed list of initially supported cities. The `City` model is the source of truth at
// runtime (Super Admin can add more via "Manage Cities" in Phase 6) — this constant is
// only used by the seed script and for validation fallbacks.
const SUPPORTED_CITIES = Object.freeze([
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385044, lng: 78.486671 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.971599, lng: 77.594566 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.08268, lng: 80.270721 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076090, lng: 72.877426 },
]);

module.exports = { SUPPORTED_CITIES };
