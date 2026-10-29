import { createHmac, timingSafeEqual } from 'node:crypto';
import Item from '../models/item.model.js';
import Order from '../models/order.model.js';
import DeliveryAssignment from '../models/delivery.assigment.js';
import Shop from '../models/shop.model.js';
import User from '../models/user.model.js';

const isValidObjectId = (value) =>
    typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUser = async (userId) =>
    User.findById(userId).select('_id role fullName email mobile');

const publicOrder = (order) => ({
    _id: order._id,
    shop: order.shop,
    customer: order.customer,
    items: order.items,
    total: order.total,
    deliveryAddress: order.deliveryAddress,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
});

export const getAvailableMenu = async (req, res) => {
    try {
        const shops = await Shop.find({})
            .select('name image city state items')
            .populate({
                path: 'items',
                select: 'name image category price type',
            })
            .lean();
        const menu = shops.map((shop) => ({
            ...shop,
            items: shop.items || [],
        }));
        return res.status(200).json({ success: true, shops: menu });
    } catch (error) {
        console.error('Menu lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load the food menu.',
        });
    }
};

export const createCustomerOrder = async (req, res) => {
    try {
        const customer = await getUser(req.userId);
        if (customer?.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Only customer accounts can place orders.',
            });
        }

        const { shopId, items, deliveryAddress, deliveryLocation, paymentMethod } = req.body;
        const hasValidDeliveryLocation =
            deliveryLocation &&
            typeof deliveryLocation.latitude === 'number' &&
            Number.isFinite(deliveryLocation.latitude) &&
            deliveryLocation.latitude >= -90 &&
            deliveryLocation.latitude <= 90 &&
            typeof deliveryLocation.longitude === 'number' &&
            Number.isFinite(deliveryLocation.longitude) &&
            deliveryLocation.longitude >= -180 &&
            deliveryLocation.longitude <= 180;
        if (
            !isValidObjectId(shopId) ||
            !Array.isArray(items) ||
            items.length === 0 ||
            items.length > 50 ||
            typeof deliveryAddress !== 'string' ||
            deliveryAddress.trim().length < 5 ||
            deliveryAddress.trim().length > 500 ||
            (deliveryLocation != null && !hasValidDeliveryLocation) ||
            !['cod', 'razorpay'].includes(paymentMethod)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Shop, food items, delivery address, and payment method are required.',
            });
        }

        const shop = await Shop.findById(shopId).select('_id name');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'The selected shop was not found.',
            });
        }

        const quantities = new Map();
        for (const line of items) {
            if (!isValidObjectId(line?.itemId) || !Number.isInteger(line?.quantity)
                || line.quantity < 1 || line.quantity > 99) {
                return res.status(400).json({
                    success: false,
                    message: 'Order contains an invalid food item or quantity.',
                });
            }
            quantities.set(
                line.itemId,
                (quantities.get(line.itemId) || 0) + line.quantity
            );
        }
        if ([...quantities.values()].some((quantity) => quantity > 99)) {
            return res.status(400).json({
                success: false,
                message: 'An item quantity cannot exceed 99.',
            });
        }

        const menuItems = await Item.find({
            _id: { $in: [...quantities.keys()] },
            shop: shop._id,
        }).select('_id name image price');
        if (menuItems.length !== quantities.size) {
            return res.status(400).json({
                success: false,
                message: 'One or more food items are not available at this shop.',
            });
        }

        const orderItems = menuItems.map((item) => ({
            item: item._id,
            name: item.name,
            image: item.image,
            quantity: quantities.get(item._id.toString()),
            unitPrice: item.price,
        }));
        const total = Math.round(
            orderItems.reduce(
                (sum, item) => sum + item.unitPrice * item.quantity,
                0
            ) * 100
        ) / 100;

        if (paymentMethod === 'razorpay') {
            const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
            if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
                return res.status(503).json({
                    success: false,
                    message: 'Online payment is not configured. Choose cash on delivery or contact support.',
                });
            }

            const gatewayResponse = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
                    ).toString('base64')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: Math.round(total * 100),
                    currency: 'INR',
                    receipt: `wingoo-${Date.now()}`,
                }),
            });
            const gatewayData = await gatewayResponse.json();
            if (!gatewayResponse.ok) {
                console.error('Razorpay order creation failed:', gatewayData);
                return res.status(502).json({
                    success: false,
                    message: 'Online payment could not be started. Please retry or choose COD.',
                });
            }

            const order = await Order.create({
                shop: shop._id,
                customer: customer._id,
                items: orderItems,
                total,
                deliveryAddress: deliveryAddress.trim(),
                ...(hasValidDeliveryLocation ? { deliveryLocation } : {}),
                paymentMethod,
                paymentStatus: 'pending',
                status: 'awaiting_payment',
                razorpayOrderId: gatewayData.id,
            });
            console.log('Razorpay order initialized:', {
                success: true,
                orderId: order._id.toString(),
                shopId: shop._id.toString(),
            });
            return res.status(201).json({
                success: true,
                message: 'Complete payment to confirm your order.',
                order: publicOrder(order),
                payment: {
                    keyId: RAZORPAY_KEY_ID,
                    razorpayOrderId: gatewayData.id,
                    amount: gatewayData.amount,
                    currency: gatewayData.currency,
                },
            });
        }

        const order = await Order.create({
            shop: shop._id,
            customer: customer._id,
            items: orderItems,
            total,
            deliveryAddress: deliveryAddress.trim(),
            ...(hasValidDeliveryLocation ? { deliveryLocation } : {}),
            paymentMethod,
            paymentStatus: 'pending',
            status: 'pending',
        });
        console.log('COD order created:', {
            success: true,
            orderId: order._id.toString(),
            shopId: shop._id.toString(),
        });
        return res.status(201).json({
            success: true,
            message: 'Order placed. Pay cash on delivery.',
            order: publicOrder(order),
        });
    } catch (error) {
        console.error('Customer order creation failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to place the order. Please try again.',
        });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const customer = await getUser(req.userId);
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            req.body;

        if (
            customer?.role !== 'user' ||
            !isValidObjectId(orderId) ||
            typeof razorpay_order_id !== 'string' ||
            typeof razorpay_payment_id !== 'string' ||
            typeof razorpay_signature !== 'string' ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification details are invalid.',
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            customer: customer._id,
            paymentMethod: 'razorpay',
            razorpayOrderId: razorpay_order_id,
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Payment order was not found.',
            });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified.',
                order: publicOrder(order),
            });
        }

        const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest();
        const actual = Buffer.from(razorpay_signature, 'hex');
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed.',
            });
        }

        order.paymentStatus = 'paid';
        order.razorpayPaymentId = razorpay_payment_id;
        order.status = 'pending';
        await order.save();
        console.log('Razorpay payment verified:', {
            success: true,
            orderId: order._id.toString(),
        });
        return res.status(200).json({
            success: true,
            message: 'Payment successful and order confirmed.',
            order: publicOrder(order),
        });
    } catch (error) {
        console.error('Razorpay payment verification failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to verify payment. Please contact support before retrying.',
        });
    }
};

export const getCustomerOrders = async (req, res) => {
    try {
        const customer = await getUser(req.userId);
        if (customer?.role !== 'user') {
            return res.status(403).json({
                success: false,
                message: 'Only customer accounts can view these orders.',
            });
        }
        const orders = await Order.find({ customer: customer._id })
            .sort({ createdAt: -1 })
            .populate('shop', 'name')
            .populate({
                path: 'assignment',
                select: 'status acceptedAt currentLocation',
                populate: {
                    path: 'assignedTo',
                    select: 'fullName mobile',
                },
            })
            .lean();
        for (const order of orders) {
            if (order.status !== 'out_for_delivery' && order.assignment) {
                delete order.assignment.currentLocation;
            }
        }
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Customer order lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load your orders.',
        });
    }
};

export const getOwnerPendingCount = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Create your shop before viewing orders.',
            });
        }
        const count = await Order.countDocuments({
            shop: shop._id,
            status: 'pending',
        });
        return res.status(200).json({ success: true, count });
    } catch (error) {
        console.error('Pending order count failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load pending order count.',
        });
    }
};

export const getOwnerOrders = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Create your shop before viewing orders.',
            });
        }
        const orders = await Order.find({ shop: shop._id })
            .sort({ createdAt: -1 })
            .populate('customer', 'fullName email mobile')
            .populate({
                path: 'assignment',
                select: 'status acceptedAt assignedTo',
                populate: { path: 'assignedTo', select: 'fullName mobile city state' },
            });
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Owner order lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load shop orders.',
        });
    }
};

export const getOwnerDeliveryBoys = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('city state');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Create your shop before viewing delivery partners.',
            });
        }

        const city = typeof shop.city === 'string' ? shop.city.trim() : '';
        const state = typeof shop.state === 'string' ? shop.state.trim() : '';
        if (!city || !state) {
            return res.status(400).json({
                success: false,
                message: 'Add your shop city and state to find local delivery partners.',
            });
        }

        const deliveryBoys = await User.find({
            role: 'deliveryBoy',
            city: new RegExp(`^${escapeRegExp(city)}$`, 'i'),
            state: new RegExp(`^${escapeRegExp(state)}$`, 'i'),
        })
            .select('_id fullName mobile city state')
            .sort({ fullName: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            location: { city, state },
            deliveryBoys,
        });
    } catch (error) {
        console.error('Owner delivery partner lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load delivery partners.',
        });
    }
};

export const assignOwnerOrder = async (req, res) => {
    let createdAssignment;
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id city state');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.',
            });
        }

        if (!isValidObjectId(req.params.orderId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid order is required.',
            });
        }

        const city = typeof shop.city === 'string' ? shop.city.trim() : '';
        const state = typeof shop.state === 'string' ? shop.state.trim() : '';
        if (!city || !state) {
            return res.status(400).json({
                success: false,
                message: 'Add your shop city and state before requesting a delivery partner.',
            });
        }

        const deliveryBoys = await User.find({
            role: 'deliveryBoy',
            city: new RegExp(`^${escapeRegExp(city)}$`, 'i'),
            state: new RegExp(`^${escapeRegExp(state)}$`, 'i'),
        }).select('_id');
        if (!deliveryBoys.length) {
            return res.status(404).json({
                success: false,
                message: 'No delivery partners were found in your shop location.',
            });
        }

        const order = await Order.findOne({
            _id: req.params.orderId,
            shop: shop._id,
            status: 'ready',
            assignment: null,
        }).select('_id status assignment');
        if (!order) {
            return res.status(409).json({
                success: false,
                message: 'Only ready, unassigned orders can be sent to delivery partners.',
            });
        }

        createdAssignment = await DeliveryAssignment.create({
            order: order._id,
            shop: shop._id,
            shopOrderId: order._id,
            broadcastedTo: deliveryBoys.map(({ _id }) => _id),
            status: 'broadcasted',
        });
        const updated = await Order.findOneAndUpdate(
            {
                _id: order._id,
                shop: shop._id,
                status: 'ready',
                assignment: null,
            },
            {
                $set: {
                    assignment: createdAssignment._id,
                    status: 'out_for_delivery',
                },
            },
            { new: true, runValidators: true }
        );
        if (!updated) {
            await DeliveryAssignment.deleteOne({ _id: createdAssignment._id });
            createdAssignment = null;
            return res.status(409).json({
                success: false,
                message: 'This order has already been sent to delivery partners or is no longer ready.',
            });
        }

        const broadcastOrder = await Order.findById(order._id)
            .populate('customer', 'fullName email mobile')
            .populate({
                path: 'assignment',
                select: 'status acceptedAt',
            });
        createdAssignment = null;
        return res.status(200).json({
            success: true,
            message: `Delivery request sent to ${deliveryBoys.length} local delivery partner${deliveryBoys.length === 1 ? '' : 's'}.`,
            order: broadcastOrder,
        });
    } catch (error) {
        if (createdAssignment) {
            await DeliveryAssignment.deleteOne({ _id: createdAssignment._id });
        }
        console.error('Order delivery assignment failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to assign this order to a delivery partner.',
        });
    }
};

export const getDeliveryBoyOrders = async (req, res) => {
    try {
        const deliveryBoy = await getUser(req.userId);
        if (deliveryBoy?.role !== 'deliveryBoy') {
            return res.status(403).json({
                success: false,
                message: 'Only delivery partner accounts can view assigned orders.',
            });
        }

        const assignments = await DeliveryAssignment.find({
            status: { $in: ['broadcasted', 'assigned'] },
            $or: [
                { assignedTo: deliveryBoy._id },
                { status: 'broadcasted', broadcastedTo: deliveryBoy._id },
            ],
        }).select('_id');
        const orders = await Order.find({
            assignment: { $in: assignments.map(({ _id }) => _id) },
            status: 'out_for_delivery',
        })
            .sort({ createdAt: -1 })
            .populate('customer', 'fullName mobile')
            .populate('shop', 'name city state')
            .populate({
                path: 'assignment',
                select: 'status assignedTo',
                populate: { path: 'assignedTo', select: 'fullName' },
            });
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Delivery partner order lookup failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load assigned orders.',
        });
    }
};

export const acceptDeliveryOrder = async (req, res) => {
    try {
        const deliveryBoy = await getUser(req.userId);
        if (deliveryBoy?.role !== 'deliveryBoy') {
            return res.status(403).json({
                success: false,
                message: 'Only delivery partners can accept deliveries.',
            });
        }
        if (!isValidObjectId(req.params.orderId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid order is required.',
            });
        }

        const order = await Order.findOne({
            _id: req.params.orderId,
            status: 'out_for_delivery',
        }).select('_id assignment');
        if (!order?.assignment) {
            return res.status(404).json({
                success: false,
                message: 'This delivery is no longer available.',
            });
        }

        const assignment = await DeliveryAssignment.findOneAndUpdate(
            {
                _id: order.assignment,
                status: 'broadcasted',
                assignedTo: null,
                broadcastedTo: deliveryBoy._id,
            },
            {
                $set: {
                    assignedTo: deliveryBoy._id,
                    status: 'assigned',
                    acceptedAt: new Date(),
                },
            },
            { new: true }
        );
        if (!assignment) {
            return res.status(409).json({
                success: false,
                message: 'Another delivery partner has already accepted this order.',
            });
        }

        const acceptedOrder = await Order.findById(order._id)
            .populate('customer', 'fullName mobile')
            .populate('shop', 'name city state')
            .populate({
                path: 'assignment',
                select: 'status assignedTo',
                populate: { path: 'assignedTo', select: 'fullName' },
            });
        return res.status(200).json({
            success: true,
            message: 'Delivery accepted.',
            order: acceptedOrder,
        });
    } catch (error) {
        console.error('Delivery acceptance failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to accept this delivery.',
        });
    }
};

export const updateDeliveryOrderLocation = async (req, res) => {
    try {
        const deliveryBoy = await getUser(req.userId);
        if (deliveryBoy?.role !== 'deliveryBoy') {
            return res.status(403).json({
                success: false,
                message: 'Only delivery partners can share delivery locations.',
            });
        }
        if (!isValidObjectId(req.params.orderId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid order is required.',
            });
        }

        const { latitude, longitude } = req.body;
        if (
            typeof latitude !== 'number' ||
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90 ||
            typeof longitude !== 'number' ||
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            return res.status(400).json({
                success: false,
                message: 'Valid latitude and longitude are required.',
            });
        }

        const order = await Order.findOne({
            _id: req.params.orderId,
            status: 'out_for_delivery',
        }).select('_id assignment');
        if (!order?.assignment) {
            return res.status(404).json({
                success: false,
                message: 'This active delivery was not found.',
            });
        }

        const assignment = await DeliveryAssignment.findOneAndUpdate(
            {
                _id: order.assignment,
                assignedTo: deliveryBoy._id,
                status: 'assigned',
            },
            {
                $set: {
                    'currentLocation.latitude': latitude,
                    'currentLocation.longitude': longitude,
                    'currentLocation.updatedAt': new Date(),
                },
            },
            { new: true, runValidators: true }
        ).select('currentLocation');
        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Accept this delivery before sharing its location.',
            });
        }

        return res.status(200).json({
            success: true,
            location: assignment.currentLocation,
        });
    } catch (error) {
        console.error('Delivery partner live location update failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update the live delivery location.',
        });
    }
};

export const updateOwnerOrderStatus = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).select('_id city state');
        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.',
            });
        }
        const allowedStatuses = new Set([
            'accepted',
            'preparing',
            'ready',
            'completed',
            'cancelled',
        ]);
        const { status } = req.body;
        if (!allowedStatuses.has(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status. Select a delivery partner to send an order out for delivery.',
            });
        }
        const canFinishDelivery =
            ['completed', 'cancelled'].includes(status);
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.orderId,
                shop: shop._id,
                status: canFinishDelivery
                    ? { $nin: ['awaiting_payment', 'completed', 'cancelled'] }
                    : { $nin: ['awaiting_payment', 'out_for_delivery', 'completed', 'cancelled'] },
                ...(canFinishDelivery ? {} : { assignment: null }),
            },
            { $set: { status } },
            { new: true, runValidators: true }
        );
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }
        await order.populate('customer', 'fullName email mobile');
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Order status updated.',
            order,
        });
    } catch (error) {
        console.error('Order status update failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update order status.',
        });
    }
};
