const jwt = require('jsonwebtoken');
const User = require('../models/User');

const checkAdminRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            // Get token from header
            const token = req.header('Authorization')?.replace('Bearer ', '');
        
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token, authorization denied'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'User account is deactivated'
                });
            }

            // Check role hierarchy
            const roleHierarchy = {
                'superadmin': ['superadmin', 'admin', 'vendor'],
                'admin': ['admin', 'vendor'],
                'vendor': ['vendor']
            };

            if (!roleHierarchy[user.role]?.includes(requiredRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Add user to request
            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({
                success: false,
                message: 'Token is not valid',
                error: error.message
            });
        }
    };
};

module.exports = {
    checkAdminRole
}; 