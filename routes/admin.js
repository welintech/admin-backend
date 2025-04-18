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

// Create new user
router.post('/user', async (req, res) => {
  try {
    const { name, email, password, mobile, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Check if user already exists with email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if user already exists with mobile
    const existingUserByMobile = await User.findOne({ mobile });
    if (existingUserByMobile) {
      return res.status(400).json({
        success: false,
        message: 'User with this mobile number already exists',
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      mobile,
      role: role || 'user', // Default to 'user' if role not specified
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
  } catch (err) {
    console.error('Error creating user:', err);

    // Handle specific MongoDB errors
    if (err.code === 11000) {
      const field = err.message.includes('email') ? 'email' : 'mobile';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: err.message,
    });
  }
});

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

// Update user
router.put('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, isActive } = req.body;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
    }

    // Check if mobile is being changed and if new mobile already exists
    if (mobile && mobile !== user.mobile) {
      const existingUser = await User.findOne({ mobile });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this mobile number already exists',
        });
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
  } catch (err) {
    console.error('Error updating user:', err);

    // Handle specific MongoDB errors
    if (err.code === 11000) {
      const field = err.message.includes('email') ? 'email' : 'mobile';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: err.message,
    });
  }
});

// Activate user
router.patch('/user/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({
      success: false,
      message: 'Error activating user',
      error: err.message,
    });
  }
});

// Deactivate user
router.patch('/user/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
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
  } catch (err) {
    console.error('Error deactivating user:', err);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user',
      error: err.message,
    });
  }
});

// Check if mobile number exists
router.get('/user/check-mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    // Validate mobile number format
    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number',
      });
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
  } catch (err) {
    console.error('Error checking mobile number:', err);
    res.status(500).json({
      success: false,
      message: 'Error checking mobile number',
      error: err.message,
    });
  }
});

module.exports = router;
