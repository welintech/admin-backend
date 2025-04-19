const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Member = require('../models/Member');
const router = express.Router();

// User registration (admin or vendor)
router.post('/register', async (req, res) => {
  const { name, email, password, mobile, role } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    // Create user
    user = new User({
      name,
      email,
      password,
      mobile,
      role,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: err.message,
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Create JWT
    const payload = {
      id: user._id,
      role: user.role,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token: `Bearer ${token}`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          mobile: user.mobile,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: err.message,
    });
  }
});

// Member login
router.post('/member/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find member by email
    let member = await Member.findOne({ email });
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Create JWT
    const payload = {
      id: member._id,
      role: 'member',
      email: member.email,
      welinId: member.welinId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token: `Bearer ${token}`,
        user: {
          _id: member._id,
          welinId: member.welinId,
          memberName: member.memberName,
          email: member.email,
          contactNo: member.contactNo,
          role: member.role,
        },
      },
    });
  } catch (err) {
    console.error('Member login error:', err);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: err.message,
    });
  }
});

module.exports = router;
