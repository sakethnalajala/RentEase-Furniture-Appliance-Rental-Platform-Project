const express = require('express');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const ctrl = require('../controllers/user.controller');
const { updateProfileSchema, selectCitySchema, changePasswordSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.patch('/me', validate(updateProfileSchema), ctrl.updateProfile);
router.patch('/me/city', validate(selectCitySchema), ctrl.selectCity);
router.patch('/me/password', validate(changePasswordSchema), ctrl.changePassword);
router.delete('/me', ctrl.deactivateAccount);

module.exports = router;
