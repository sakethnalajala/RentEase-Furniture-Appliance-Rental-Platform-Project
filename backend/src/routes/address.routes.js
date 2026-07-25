const express = require('express');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/address.controller');
const { createAddressSchema, updateAddressSchema } = require('../validators/address.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', ctrl.listAddresses);
router.post('/', validate(createAddressSchema), ctrl.createAddress);
router.patch('/:id', validate(updateAddressSchema), ctrl.updateAddress);
router.delete('/:id', ctrl.deleteAddress);

module.exports = router;
