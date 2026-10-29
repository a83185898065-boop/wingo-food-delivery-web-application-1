import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';

dotenv.config({
    path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'),
});

try {
    await connectDB();
    console.log('Database connectivity check passed.');
} catch (error) {
    console.error(
        `Database connectivity check failed (${error.name || 'UnknownError'}). Check MONGO_URL, network access, and database credentials.`
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
