
import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Backend directory
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));

// Environment variables
dotenv.config({
    path: path.join(backendDirectory, '.env')
});

// Database
import connectDB from './config/db.js';

// Routes
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import shopRouter from './routes/shop.routes.js';
import itemRouter from './routes/item.routes.js';
import orderRouter from './routes/order.routes.js';

// Express app
const app = express();
const port = process.env.PORT || 5000;

// Frontend URL configuration
const frontendUrl = process.env.FRONTEND_URL?.trim();

const frontendOrigin = frontendUrl
    ? new URL(
        frontendUrl.includes('://')
            ? frontendUrl
            : `https://${frontendUrl}`
    ).origin
    : 'https://wingo-food-delivery-web-application-1.onrender.com';

// Allowed origins
const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    frontendOrigin
]);

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        console.error('Blocked CORS origin:', origin);
        return callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Wingoo Backend API 🚀',
        status: 'Running'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        message: 'Wingoo server is healthy'
    });
});

// Uploads folder
app.use(
    '/uploads',
    express.static(path.join(backendDirectory, 'uploads'))
);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/shop', shopRouter);
app.use('/api/item', itemRouter);
app.use('/api/order', orderRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`🚀 Wingoo Backend running on port ${port}`);
            console.log('MongoDB connected successfully');
            console.log(`Frontend allowed: ${frontendOrigin}`);
        });
    } catch (error) {
        console.error('Failed to start Wingoo Backend:', error);
        process.exit(1);
    }
};

startServer();
