import multer from 'multer';

const allowedImageTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        if (!allowedImageTypes.has(file.mimetype)) {
            callback(new Error('Shop image must be a JPEG, PNG, or WebP file.'));
            return;
        }

        callback(null, true);
    },
});

export default upload;
