import jwt from 'jsonwebtoken';

const isAuth = async (req, res, next) => {
    try {
        // Accept token from cookie or Authorization header (Bearer <token>)
        let token = req.cookies?.token;
        if (!token && req.headers?.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
                token = parts[1];
            }
        }

        if (!token) {
            return res.status(401).json({ message: 'Authentication token not provided' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // attach decoded payload and userId for downstream use
        req.auth = decoded;
        req.userId = decoded.userId;
        return next();
    } catch (error) {
        console.error('isAuth unexpected error:', error);
        return res.status(500).json({ message: 'isAuth error' });
    }
};

export default isAuth;