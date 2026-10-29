import Item from '../models/item.model.js';
import Shop from '../models/shop.model.js';
import {
    removeUploadedImage,
    saveUploadedImage,
} from '../utils/saveUploadedImage.js';

const categories = new Set([
    'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Desserts',
    'Fast Food', 'Healthy', 'Vegan', 'Vegetarian', 'Seafood', 'Grill',
    'Pizza', 'Pasta', 'Salads', 'Soups', 'Sandwiches', 'Burgers',
    'Asian', 'Mexican', 'Indian', 'Mediterranean', 'Others',
]);

export const addItem = async (req, res) => {
    let savedImagePath;

    try {
        const shop = await Shop.findOne({ owner: req.userId });
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Create your shop before adding food items.',
            });
        }

        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const category =
            typeof req.body.category === 'string' ? req.body.category : '';
        const type = typeof req.body.type === 'string' ? req.body.type : '';
        const price = Number(req.body.price);

        if (!name || !categories.has(category) || !['Veg', 'Non-Veg'].includes(type)
            || !Number.isFinite(price) || price < 0 || !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Food name, image, valid category, food type, and price are required.',
            });
        }

        const storedImage = await saveUploadedImage(req.file);
        savedImagePath = storedImage.imagePath;

        const item = await Item.create({
            name,
            category,
            type,
            price,
            image: storedImage.image,
            shop: shop._id,
        });

        shop.items.push(item._id);
        await shop.save();

        console.log('Food item creation response:', {
            success: true,
            itemId: item._id.toString(),
            shopId: shop._id.toString(),
            name: item.name,
        });
        return res.status(201).json({
            success: true,
            message: 'Food item added successfully.',
            item,
        });
    } catch (error) {
        await removeUploadedImage(savedImagePath);
        console.error('Food item creation failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to add food item. Please try again.',
        });
    }
};

export const editItem = async (req, res) => {
    let savedImagePath;

    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id items');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.',
            });
        }

        const item = await Item.findOne({ _id: req.params.itemId, shop: shop._id });
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Food item not found.',
            });
        }

        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const category =
            typeof req.body.category === 'string' ? req.body.category : '';
        const type = typeof req.body.type === 'string' ? req.body.type : '';
        const price = Number(req.body.price);
        if (!name || !categories.has(category) || !['Veg', 'Non-Veg'].includes(type)
            || !Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                success: false,
                message: 'Food name, valid category, food type, and price are required.',
            });
        }

        if (req.file) {
            const storedImage = await saveUploadedImage(req.file);
            savedImagePath = storedImage.imagePath;
            item.image = storedImage.image;
        }

        item.name = name;
        item.category = category;
        item.type = type;
        item.price = price;
        await item.save();
        await Shop.updateOne(
            { _id: shop._id, items: { $ne: item._id } },
            { $addToSet: { items: item._id } }
        );

        console.log('Food item update response:', {
            success: true,
            itemId: item._id.toString(),
            shopId: shop._id.toString(),
        });
        return res.status(200).json({
            success: true,
            message: 'Food item updated successfully.',
            item,
        });
    } catch (error) {
        await removeUploadedImage(savedImagePath);
        console.error('Food item update failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update food item. Please try again.',
        });
    }
};

export const deleteItem = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.',
            });
        }

        const item = await Item.findOneAndDelete({
            _id: req.params.itemId,
            shop: shop._id,
        });
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Food item not found.',
            });
        }

        await Shop.updateOne(
            { _id: shop._id },
            { $pull: { items: item._id } }
        );
        console.log('Food item deletion response:', {
            success: true,
            itemId: item._id.toString(),
            shopId: shop._id.toString(),
        });
        return res.status(200).json({
            success: true,
            message: 'Food item deleted successfully.',
            itemId: item._id,
        });
    } catch (error) {
        console.error('Food item deletion failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to delete food item. Please try again.',
        });
    }
};
