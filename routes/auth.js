const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const router = express.Router();

// User registration (admin or vendor)
router.post('/register', async (req, res) => {
  const { username, password, role, vendorData } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create user
    user = new User({
      username,
      password,
      role
    });

    await user.save();

    // If role is vendor, create vendor profile
    let vendor = null;
    if (role === 'vendor' && vendorData) {
      vendor = new Vendor({
        name: vendorData.name,
        email: vendorData.email,
        phone: vendorData.phone,
        address: vendorData.address,
        userId: user._id
      });

      await vendor.save();
    }

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          role: user.role
        },
        vendor: vendor ? {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email
        } : null
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: err.message
    });
  }
});

// User login (admin or vendor)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // If user is vendor, get vendor profile
    let vendor = null;
    if (user.role === 'vendor') {
      vendor = await Vendor.findOne({ userId: user._id });
      if (!vendor) {
        return res.status(400).json({
          success: false,
          message: 'Vendor profile not found'
        });
      }
    }

    // Create JWT
    const payload = {
      id: user._id,
      role: user.role,
      vendorId: vendor ? vendor._id : null
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token: `Bearer ${token}`,
        user: {
          _id: user._id,
          username: user.username,
          role: user.role
        },
        vendor: vendor ? {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address
        } : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: err.message
    });
  }
});

// Dashboard route
router.get('/dashboard', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = req.user;
    
    // Get vendor profile if user is a vendor
    let vendor = null;
    if (user.role === 'vendor') {
      vendor = await Vendor.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      message: `Welcome to ${user.role} dashboard`,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          role: user.role
        },
        vendor: vendor ? {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email
        } : null
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Error accessing dashboard',
      error: err.message
    });
  }
});

module.exports = router;