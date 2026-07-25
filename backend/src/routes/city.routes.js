const express = require('express');
const { listCities } = require('../controllers/city.controller');

const router = express.Router();

router.get('/', listCities);

module.exports = router;
