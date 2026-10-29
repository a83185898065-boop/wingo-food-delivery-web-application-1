import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendDirectory, '.env') });

import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import shopRouter from './routes/shop.routes.js';
import itemRouter from './routes/item.routes.js';
import orderRouter from './routes/order.routes.js';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;

const frontendUrl = process.env.FRONTEND_URL?.trim();
const frontendOrigin = frontendUrl
  ? new URL(frontendUrl.includes('://') ? frontendUrl : `https://${frontendUrl}`).origin
  : 'https://wingo-food-delivery-web-application-1.onrender.com';
const allowedOrigins = new Set([
  'http://localhost:5173',
  frontendOrigin,
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS origin is not allowed: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.use('/uploads', express.static(path.join(backendDirectory, 'uploads')));
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/shop', shopRouter);
app.use('/api/item', itemRouter);
app.use('/api/order', orderRouter);

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running at ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server due to DB connection error.');
    process.exit(1);
  }
})();
