const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// User registration (admin or vendor)
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

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

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          role: user.role
        }
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

    // Create JWT
    const payload = {
      id: user._id,
      role: user.role,
      username: user.username
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
        }
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


module.exports = router;