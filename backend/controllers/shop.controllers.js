import Shop from '../models/shop.model.js';
import User from '../models/user.model.js';
import {
    removeUploadedImage,
    saveUploadedImage,
} from '../utils/saveUploadedImage.js';

const getOwner = async (userId) => {
    const owner = await User.findById(userId).select('_id role');
    return owner?.role === 'owner' ? owner : null;
};

export const getMyShop = async (req, res) => {
    try {
        const owner = await getOwner(req.userId);
        if (!owner) {
            return res.status(403).json({
                success: false,
                message: 'Only restaurant owners can view a shop.',
            });
        }

        const shop = await Shop.findOne({ owner: owner._id })
            .select('-__v')
            .populate('items');
        console.log('Shop lookup response:', {
            success: true,
            found: Boolean(shop),
            ownerId: owner._id.toString(),
        });
        return res.status(200).json({ success: true, shop });
    } catch (error) {
        console.error('Shop lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load your shop.',
        });
    }
};

export const createShop = async (req, res) => {
    let savedImagePath;

    try {
        const owner = await getOwner(req.userId);
        if (!owner) {
            return res.status(403).json({
                success: false,
                message: 'Only restaurant owners can create a shop.',
            });
        }

        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const city = typeof req.body.city === 'string' ? req.body.city.trim() : '';
        const state = typeof req.body.state === 'string' ? req.body.state.trim() : '';

        if (!name || !city || !state || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Shop name, shop image, city, and state are required.',
            });
        }

        const existingShop = await Shop.exists({ owner: owner._id });
        if (existingShop) {
            return res.status(409).json({
                success: false,
                message: 'You already have a shop.',
            });
        }

        const storedImage = await saveUploadedImage(req.file);
        savedImagePath = storedImage.imagePath;

        const shop = await Shop.create({
            name,
            city,
            state,
            image: storedImage.image,
            owner: owner._id,
        });

        console.log('Shop creation response:', {
            success: true,
            shopId: shop._id.toString(),
            ownerId: owner._id.toString(),
            name: shop.name,
        });
        return res.status(201).json({
            success: true,
            message: 'Shop created successfully.',
            shop,
        });
    } catch (error) {
        await removeUploadedImage(savedImagePath);
        console.error('Shop creation failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to create shop. Please try again.',
        });
    }
};

export const editShop = async (req, res) => {
    let savedImagePath;

    try {
        const owner = await getOwner(req.userId);
        if (!owner) {
            return res.status(403).json({
                success: false,
                message: 'Only restaurant owners can edit a shop.',
            });
        }

        const shop = await Shop.findOne({
            _id: req.params.shopId,
            owner: owner._id,
        });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.',
            });
        }

        for (const field of ['name', 'city', 'state']) {
            if (typeof req.body[field] === 'string' && req.body[field].trim()) {
                shop[field] = req.body[field].trim();
            }
        }

        if (req.file) {
            const storedImage = await saveUploadedImage(req.file);
            savedImagePath = storedImage.imagePath;
            shop.image = storedImage.image;
        }

        await shop.save();
        console.log('Shop update response:', {
            success: true,
            shopId: shop._id.toString(),
            ownerId: owner._id.toString(),
        });
        return res.status(200).json({
            success: true,
            message: 'Shop updated successfully.',
            shop,
        });
    } catch (error) {
        await removeUploadedImage(savedImagePath);
        console.error('Shop update failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update shop. Please try again.',
        });
    }
};
