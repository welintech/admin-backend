const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Member = require('../models/Member');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const router = express.Router();

// User registration (admin or vendor)
router.post(
  '/register',
  catchAsync(async (req, res) => {
    const { name, email, password, mobile, role } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      throw new AppError('Email already exists', 400);
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
  })
);

// User login
router.post(
  '/login',
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    let user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 400);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 400);
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
  })
);

// Member login
router.post(
  '/member/login',
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Find member by email
    let member = await Member.findOne({ email });
    if (!member) {
      throw new AppError('Invalid credentials', 400);
    }

    // Check password
    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 400);
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
  })
);

module.exports = router;
