const express = require('express');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/cart.controller');
const { addToCartSchema, updateCartItemSchema } = require('../validators/cart.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.getCart);
router.post('/', validate(addToCartSchema), ctrl.addToCart);
router.patch('/:itemId', validate(updateCartItemSchema), ctrl.updateCartItem);
router.delete('/:itemId', ctrl.removeCartItem);
router.delete('/', ctrl.clearCart);

module.exports = router;
