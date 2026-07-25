const express = require('express');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/product.controller');
const { listProductsQuerySchema } = require('../validators/product.validator');

const router = express.Router();

router.get('/', validate(listProductsQuerySchema, 'query'), ctrl.listProducts);
router.get('/subcategories', ctrl.listSubCategories);
router.get('/:id', ctrl.getProductById);

module.exports = router;
