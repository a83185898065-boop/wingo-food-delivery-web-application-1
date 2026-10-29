import User from '../models/user.model.js';

export const getCurrentUser = async (req, res) => {
    try {
        // Log incoming auth info for debugging
        console.log('getCurrentUser: req.cookies=', req.cookies, 'Authorization=', req.headers?.authorization);
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: userId not found' });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'user is not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error('getCurrentUser error:', error);
        return res.status(500).json({ message: 'get current user error' });
    }
};

export const updateDeliveryBoyLocation = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user?.role !== 'deliveryBoy') {
            return res.status(403).json({
                success: false,
                message: 'Only delivery partner accounts can update their delivery location.',
            });
        }

        const city = typeof req.body.city === 'string' ? req.body.city.trim() : '';
        const state = typeof req.body.state === 'string' ? req.body.state.trim() : '';
        if (!city || !state || city.length > 80 || state.length > 80) {
            return res.status(400).json({
                success: false,
                message: 'City and state are required and must be 80 characters or fewer.',
            });
        }

        user.city = city;
        user.state = state;
        await user.save();
        return res.status(200).json({
            success: true,
            message: 'Delivery location updated.',
            location: { city: user.city, state: user.state },
        });
    } catch (error) {
        console.error('Delivery partner location update failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to update delivery location.',
        });
    }
};