import express from 'express';
import {
    createShop,
    editShop,
    getMyShop,
} from '../controllers/shop.controllers.js';
import isAuth from '../middlewares/isAuth.js';
import upload from '../middlewares/multer.js';

const shopRouter = express.Router();

const uploadShopImage = (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (error) {
            console.error('Shop image upload failed:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Unable to upload shop image.',
            });
        }

        return next();
    });
};

shopRouter.get('/mine', isAuth, getMyShop);
shopRouter.post('/create', isAuth, uploadShopImage, createShop);
shopRouter.put('/edit/:shopId', isAuth, uploadShopImage, editShop);

export default shopRouter;
