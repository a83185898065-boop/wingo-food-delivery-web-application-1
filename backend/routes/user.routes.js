import express from 'express';
import {
    getCurrentUser,
    updateDeliveryBoyLocation,
} from '../controllers/user.controller.js';
import isAuth from '../middlewares/isAuth.js';
const router = express.Router();

router.get('/current', isAuth, getCurrentUser);
router.patch('/delivery-location', isAuth, updateDeliveryBoyLocation);

export default router;