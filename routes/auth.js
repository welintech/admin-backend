const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

const router = express.Router();

// Vendor registration
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    let vendor = await User.findOne({ username });
    if (vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor already exists'
      });
    }

    vendor = new User({
      username,
      password,
      role: 'vendor'  // Always set role as vendor
    });

    await vendor.save();

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully',
      data: {
        username: vendor.username,
        role: vendor.role,
        _id: vendor._id
      }
    });
  } catch (err) {
    console.error('Vendor registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Error registering vendor',
      error: err.message
    });
  }
});

// Vendor login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    let vendor = await User.findOne({ username, role: 'vendor' });
    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor credentials'
      });
    }

    const isMatch = await vendor.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor credentials'
      });
    }

    // Create JWT
    const payload = {
      id: vendor._id,
      role: vendor.role
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: 'Vendor logged in successfully',
      data: {
        token: `Bearer ${token}`,
        vendor: {
          _id: vendor._id,
          username: vendor.username,
          role: vendor.role
        }
      }
    });
  } catch (err) {
    console.error('Vendor login error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during vendor login',
      error: err.message
    });
  }
});

// Vendor dashboard
router.get('/dashboard', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    // Ensure the authenticated user is a vendor
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vendor only route.'
      });
    }

    res.json({
      success: true,
      message: 'Welcome to vendor dashboard',
      data: {
        vendor: {
          _id: req.user._id,
          username: req.user.username,
          role: req.user.role
        }
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
