const express = require('express');
const Member = require('../models/Member');
const User = require('../models/User');
const WelinIdCounter = require('../models/WelinIdCounter');
const { checkAdminRole } = require('../middleware/auth');
const passport = require('passport');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// Add passport authentication middleware
router.use(passport.authenticate('jwt', { session: false }));

// Get all members
router.get(
  '/',
  catchAsync(async (req, res) => {
    const members = await Member.find().populate(
      'vendorId',
      'name email mobile'
    );
    res.json({
      success: true,
      data: members,
    });
  })
);

// Get members by vendor ID
router.get(
  '/vendor/:vendorId',
  catchAsync(async (req, res) => {
    const { vendorId } = req.params;

    // Validate vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      throw new AppError('Vendor not found', 404);
    }

    const members = await Member.find({ vendorId }).populate(
      'vendorId',
      'name email mobile'
    );
    res.json({
      success: true,
      data: members,
    });
  })
);

// Get member by welin ID
router.get(
  '/welin/:welinId',
  catchAsync(async (req, res) => {
    const { welinId } = req.params;
    const member = await Member.findOne({ welinId }).populate(
      'vendorId',
      'name email mobile'
    );

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    res.json({
      success: true,
      data: member,
    });
  })
);

// Create new member
router.post(
  '/',
  catchAsync(async (req, res) => {
    const memberData = req.body;

    // Validate vendor exists
    const vendor = await User.findById(memberData.vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      throw new AppError('Invalid vendor ID', 400);
    }

    // Generate Welin ID first
    const welinId = await WelinIdCounter.getNextId();

    // Create new member with generated Welin ID
    const member = new Member({
      ...memberData,
      welinId,
      // Ensure password is included in the member data
      password: memberData.password || 'password', // You might want to generate a random password if not provided
    });

    await member.save();

    // Remove password from response
    const memberResponse = member.toObject();
    delete memberResponse.password;

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: memberResponse,
    });
  })
);

// Update member
router.put(
  '/:id',
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validate member exists
    const member = await Member.findById(id);
    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // If vendorId is being updated, validate new vendor
    if (
      updateData.vendorId &&
      updateData.vendorId !== member.vendorId.toString()
    ) {
      const vendor = await User.findById(updateData.vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        throw new AppError('Invalid vendor ID', 400);
      }
    }

    // If welinId is being updated, check for duplicates
    if (updateData.welinId && updateData.welinId !== member.welinId) {
      const existingMember = await Member.findOne({
        welinId: updateData.welinId,
      });
      if (existingMember) {
        throw new AppError('Member with this Welin ID already exists', 400);
      }
    }

    // Update member
    Object.assign(member, updateData);
    await member.save();

    // Remove password from response
    const memberResponse = member.toObject();
    delete memberResponse.password;

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: memberResponse,
    });
  })
);

// Delete member (hard delete)
router.delete(
  '/:id',
  catchAsync(async (req, res) => {
    const { id } = req.params;

    // Validate member exists
    const member = await Member.findById(id);
    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // Hard delete
    await Member.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Member deleted successfully',
    });
  })
);

module.exports = router;
