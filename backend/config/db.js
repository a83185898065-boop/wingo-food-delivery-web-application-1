import mongoose from 'mongoose';

const connectDB = async () => {
    const mongoUrl = process.env.MONGO_URL?.trim();
    if (!mongoUrl) {
        throw new Error('MONGO_URL is not configured.');
    }

    try {
        const conn = await mongoose.connect(mongoUrl);
        console.log('MongoDB connected:', conn.connection.host);
        return conn;
    } catch (error) {
        console.error('MongoDB connection failed:', error.name || 'UnknownError');
        throw error;
    }
};

export default connectDB;