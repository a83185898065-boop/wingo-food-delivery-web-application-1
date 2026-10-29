import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uploadsDirectory = fileURLToPath(new URL('../uploads/', import.meta.url));
const imageExtensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};

export const saveUploadedImage = async (file) => {
    const extension = imageExtensions[file.mimetype];
    if (!extension) {
        throw new Error('Image must be a JPEG, PNG, or WebP file.');
    }

    await mkdir(uploadsDirectory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const imagePath = path.join(uploadsDirectory, fileName);
    await writeFile(imagePath, file.buffer, { flag: 'wx' });
    return { image: `/uploads/${fileName}`, imagePath };
};

export const removeUploadedImage = async (imagePath) => {
    if (!imagePath) return;

    try {
        await unlink(imagePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Failed to remove uploaded image:', error);
        }
    }
};
