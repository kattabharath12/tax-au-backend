const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        // Check if token starts with 'Bearer '
        let actualToken = token;
        if (token.startsWith('Bearer ')) {
            actualToken = token.slice(7);
        }

        if (!actualToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        // Verify token
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

        // Check if user still exists
        const user = await User.findByPk(decoded.userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found, token invalid'
            });
        }

        // Add user info to request object
        req.user = {
            userId: decoded.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

module.exports = auth;
