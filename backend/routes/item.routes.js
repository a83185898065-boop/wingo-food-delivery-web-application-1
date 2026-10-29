import express from 'express';
import {
    addItem,
    deleteItem,
    editItem,
} from '../controllers/item.controllers.js';
import isAuth from '../middlewares/isAuth.js';
import upload from '../middlewares/multer.js';

const itemRouter = express.Router();

const uploadItemImage = (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (error) {
            console.error('Food image upload failed:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Unable to upload food image.',
            });
        }

        return next();
    });
};

itemRouter.post('/add-item', isAuth, uploadItemImage, addItem);
itemRouter.put('/:itemId', isAuth, uploadItemImage, editItem);
itemRouter.delete('/:itemId', isAuth, deleteItem);

export default itemRouter;
