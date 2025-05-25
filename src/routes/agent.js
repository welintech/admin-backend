const express = require('express');
const User = require('../models/User');
const { checkAdminRole } = require('../middleware/auth');
const passport = require('passport');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Protect all routes
router.use(checkAdminRole('vendor'));

// Add passport authentication middleware
router.use(passport.authenticate('jwt', { session: false }));

// Create new agent
router.post(
  '/',
  catchAsync(async (req, res) => {
    const { name, email, password, mobile, role } = req.body;
    const vendorId = req.user._id; // Get vendor ID from authenticated user

    // Validate required fields
    if (!name || !email || !mobile) {
      throw new AppError('All fields are required', 400);
    }

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      throw new AppError('User with this email already exists', 400);
    }

    // Check if user already exists with mobile
    const existingUserByMobile = await User.findOne({ mobile });
    if (existingUserByMobile) {
      throw new AppError('User with this mobile number already exists', 400);
    }

    // Create new agent
    const user = new User({
      name,
      email,
      password: password || 'password',
      mobile,
      vendorId, // Add vendor ID
      role,
    });

    await user.save();

    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: userResponse,
    });
  })
);

// Get all agents for the current vendor
router.get(
  '/',
  catchAsync(async (req, res) => {
    const agents = await User.find({
      'role.role': 'agent',
      vendorId: req.user._id,
    });
    res.json({
      success: true,
      data: agents,
    });
  })
);

module.exports = router;
