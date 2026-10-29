
import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema(
    {
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        shop: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shop',
            required: true,
            index: true,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        items: {
            type: [orderLineSchema],
            required: true,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        deliveryAddress: {
            type: String,
            required: true,
            trim: true,
        },

        deliveryLocation: {
            latitude: {
                type: Number,
                min: -90,
                max: 90,
                default: null,
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180,
                default: null,
            },
        },

        status: {
            type: String,
            enum: [
                'awaiting_payment',
                'pending',
                'accepted',
                'preparing',
                'ready',
                'out_for_delivery',
                'completed',
                'cancelled',
            ],
            default: 'pending',
            index: true,
        },

        // Delivery assignment reference
        assignment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DeliveryAssignment',
            default: null,
        },

        paymentMethod: {
            type: String,
            enum: ['cod', 'razorpay'],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
        },

        razorpayOrderId: {
            type: String,
            sparse: true,
        },

        razorpayPaymentId: {
            type: String,
            sparse: true,
        },
    },
    { timestamps: true }
);

const Order =
    mongoose.models.Order ||
    mongoose.model('Order', orderSchema);

export default Order;
