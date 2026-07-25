const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const City = require('../models/City');

// Public listing used by the city selector and by registration forms (vendor/delivery
// partner pick their operating city). Full CRUD for cities is a Super Admin capability
// that lands in Phase 6 (Manage Cities); this endpoint just reads.
const listCities = asyncHandler(async (req, res) => {
  const cities = await City.find({ isActive: true }).sort({ name: 1 });
  new ApiResponse(200, cities).send(res);
});

module.exports = { listCities };
