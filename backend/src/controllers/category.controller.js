const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Category = require('../models/Category');

// Public listing — powers Browse's category tabs. Full CRUD is a Super Admin capability
// that lands in Phase 6; this endpoint just reads.
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  new ApiResponse(200, categories).send(res);
});

module.exports = { listCategories };
