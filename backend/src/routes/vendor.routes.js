const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const ctrl = require('../controllers/vendor.controller');
const { updateVendorProfileSchema } = require('../validators/vendor.validator');

const router = express.Router();
router.use(authenticate, authorize(ROLES.VENDOR));

router.get('/me', ctrl.getMyProfile);
router.patch('/me', validate(updateVendorProfileSchema), ctrl.updateMyProfile);
router.post('/me/image', upload.single('file'), ctrl.uploadImage);
router.get('/me/stats', ctrl.getMyStats);
router.get('/me/delivery-partners', ctrl.listDeliveryPartners);
router.get('/me/delivery-analytics', ctrl.getDeliveryAnalytics);

module.exports = router;
