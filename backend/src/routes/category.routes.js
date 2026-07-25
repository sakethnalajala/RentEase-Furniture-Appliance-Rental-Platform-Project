const express = require('express');
const { listCategories } = require('../controllers/category.controller');

const router = express.Router();

router.get('/', listCategories);

module.exports = router;
