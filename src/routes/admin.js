const express = require('express');
const User = require('../models/User');
const Member = require('../models/Member');
const { checkAdminRole } = require('../middleware/auth');
const passport = require('passport');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Protect all routes
router.use(checkAdminRole('admin'));

// Add passport authentication middleware
router.use(passport.authenticate('jwt', { session: false }));

// Create new user
router.post(
  '/user',
  catchAsync(async (req, res) => {
    const { name, email, password, mobile, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !mobile) {
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

    // Create new user
    const user = new User({
      name,
      email,
      password,
      mobile,
      role: role || { role: 'user', componentId: 'default' }, // Default to user role if not specified
    });

    await user.save();

    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  })
);

// Get all users
router.get(
  '/users',
  catchAsync(async (req, res) => {
    const users = await User.find({
      'role.role': { $nin: ['agent', 'admin'] },
    });
    res.json({
      success: true,
      data: users,
    });
  })
);

// Get all vendors
router.get(
  '/vendor',
  catchAsync(async (req, res) => {
    const vendors = await User.find({ 'role.role': 'vendor' });
    res.json({
      success: true,
      data: vendors,
    });
  })
);

// Get all members of a vendor by vendor ID
router.get(
  '/vendor/:vendorId/members',
  catchAsync(async (req, res) => {
    const { vendorId } = req.params;
    const members = await Member.find({ vendorId });
    res.json({
      success: true,
      data: members,
    });
  })
);

// Get counts of total active users, vendors, and members
router.get(
  '/counts',
  catchAsync(async (req, res) => {
    const [activeUsers, activeVendors, activeMembers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 'role.role': 'vendor', isActive: true }),
      Member.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: {
        activeUsers,
        activeVendors,
        activeMembers,
      },
    });
  })
);

// Update user
router.put(
  '/user/:id',
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name, email, mobile, role, isActive } = req.body;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('User with this email already exists', 400);
      }
    }

    // Check if mobile is being changed and if new mobile already exists
    if (mobile && mobile !== user.mobile) {
      const existingUser = await User.findOne({ mobile });
      if (existingUser) {
        throw new AppError('User with this mobile number already exists', 400);
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    // Return updated user data without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse,
    });
  })
);

// Activate user
router.patch(
  '/user/:id/activate',
  catchAsync(async (req, res) => {
    const { id } = req.params;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Activate user
    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    });
  })
);

// Deactivate user
router.patch(
  '/user/:id/deactivate',
  catchAsync(async (req, res) => {
    const { id } = req.params;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Deactivate user
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        isActive: user.isActive,
      },
    });
  })
);

// Check if mobile number exists
router.get(
  '/user/check-mobile/:mobile',
  catchAsync(async (req, res) => {
    const { mobile } = req.params;

    // Validate mobile number format
    if (!/^[0-9]{10}$/.test(mobile)) {
      throw new AppError('Please enter a valid 10-digit mobile number', 400);
    }

    // Check if mobile exists
    const user = await User.findOne({ mobile });

    res.json({
      success: true,
      exists: !!user,
      message: user
        ? 'Mobile number already exists'
        : 'Mobile number is available',
    });
  })
);

module.exports = router;
