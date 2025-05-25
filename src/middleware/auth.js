const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const checkAdminRole = (requiredRole) => {
  return catchAsync(async (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token, authorization denied', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('User account is deactivated', 401);
    }

    // Check role hierarchy
    const roleHierarchy = {
      superadmin: ['superadmin', 'admin', 'vendor'],
      admin: ['admin', 'vendor'],
      vendor: ['vendor'],
      agent: ['agent'],
    };

    if (!roleHierarchy[user.role.role]?.includes(requiredRole)) {
      throw new AppError('Insufficient permissions', 403);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Add user to request
    req.user = user;
    next();
  });
};

module.exports = {
  checkAdminRole,
};

module.exports.checkTokenExpiration = (err, req, res, next) => {
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please log in again.',
    });
  }
  next(err);
};
