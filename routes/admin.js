const express = require('express');
const User = require('../models/User');
const Member = require('../models/Member');
const { checkAdminRole } = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// Protect all routes
router.use(checkAdminRole('admin'));

// Add passport authentication middleware
router.use(passport.authenticate('jwt', { session: false }));

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: err.message,
    });
  }
});

// Get all users with role 'vendor'
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' });
    res.json({
      success: true,
      data: vendors,
    });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: err.message,
    });
  }
});

// Get all members of a vendor by vendor ID
router.get('/vendor/:vendorId/members', async (req, res) => {
  const { vendorId } = req.params;

  try {
    const members = await Member.find({ vendorId });
    res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error('Error fetching members for vendor:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching members for vendor',
      error: err.message,
    });
  }
});

// Get counts of total active users, vendors, and members
router.get('/counts', async (req, res) => {
  try {
    const [activeUsers, activeVendors, activeMembers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'vendor', isActive: true }),
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
  } catch (err) {
    console.error('Error fetching counts:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching counts',
      error: err.message,
    });
  }
});

module.exports = router;