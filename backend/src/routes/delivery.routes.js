const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');
const { ROLES } = require('../constants/roles');
const validate = require('../middlewares/validate');
const upload = require('../middlewares/upload');
const ctrl = require('../controllers/delivery.controller');
const { deliverItemSchema, updateAvailabilitySchema, updateProfileSchema } = require('../validators/delivery.validator');

const router = express.Router();
router.use(authenticate, authorize(ROLES.DELIVERY_PARTNER));

router.get('/me', ctrl.getMyProfile);
router.patch('/me', validate(updateProfileSchema), ctrl.updateMyProfile);
router.patch('/me/availability', validate(updateAvailabilitySchema), ctrl.updateAvailability);
router.post('/me/documents', upload.single('file'), ctrl.uploadDocument);
router.post('/me/photo', upload.single('file'), ctrl.uploadPhoto);

router.get('/requests', ctrl.listRequests);
router.post('/requests/:itemId/accept', ctrl.acceptRequest);
router.post('/requests/:itemId/reject', ctrl.rejectRequest);

router.get('/assigned', ctrl.listAssigned);
router.post('/assigned/:itemId/reject', ctrl.rejectAssigned);
router.patch('/assigned/:itemId/pickup', ctrl.markPickedUp);
router.patch('/assigned/:itemId/deliver', validate(deliverItemSchema), ctrl.markDelivered);

router.get('/history', ctrl.listHistory);
router.get('/earnings', ctrl.getEarnings);
router.get('/stats', ctrl.getStats);

module.exports = router;
