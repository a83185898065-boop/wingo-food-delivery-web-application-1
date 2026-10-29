import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
            required: true,
        },
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: true,
        },
        category: {
            type: String,
            enum: [
                'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages',
                'Desserts', 'Fast Food', 'Healthy', 'Vegan', 'Vegetarian',
                'Seafood', 'Grill', 'Pizza', 'Pasta', 'Salads', 'Soups',
                'Sandwiches', 'Burgers', 'Asian', 'Mexican', 'Indian',
                'Mediterranean', 'Others',
            ],
            required: true,
        },
        price: {
            type: Number,
            min: 0,
            required: true,
        },
        type: {
            type: String,
            enum: ['Veg', 'Non-Veg'],
            required: true,
        },
    },
    { timestamps: true }
);

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
export default Item;
