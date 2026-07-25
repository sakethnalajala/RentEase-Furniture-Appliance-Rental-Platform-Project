const express = require('express');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/wishlist.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.getWishlist);
router.post('/:productId', ctrl.addToWishlist);
router.delete('/:productId', ctrl.removeFromWishlist);

module.exports = router;
