// Reusable authentication middleware for Vercel functions (ES Module)
const objectToBase64 = (obj) => {
    const jsonStr = JSON.stringify(obj);
    return Buffer.from(jsonStr).toString('base64');
};

const base64ToObject = (base64Str) => {
    const jsonStr = Buffer.from(base64Str, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
};

/**
 * Verify if the request is authorized
 * @param {Object} req - Vercel request object
 * @returns {Object|null} - Decoded user data or null if invalid
 */
export const verifyAuth = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = base64ToObject(token);

        // Check expiration
        if (decoded.exp && decoded.exp > Date.now()) {
            return decoded;
        }
    } catch (error) {
        console.error('Auth verification error:', error);
    }

    return null;
};
