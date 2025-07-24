const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

        // Set req.user to the user object from JWT payload
        // JWT payload is now { user: { id: ..., email: ... } }
        req.user = decoded.user;

        next();
    } catch (err) {
        console.error('JWT verification error:', err);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
