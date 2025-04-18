const express = require('express');
const Member = require('../models/Member');
const User = require('../models/User');
const WelinIdCounter = require('../models/WelinIdCounter');
const { checkAdminRole } = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// Add passport authentication middleware
router.use(passport.authenticate('jwt', { session: false }));

// Get all members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().populate(
      'vendorId',
      'name email mobile'
    );
    res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching members',
      error: err.message,
    });
  }
});

// Get members by vendor ID
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Validate vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    const members = await Member.find({ vendorId }).populate(
      'vendorId',
      'name email mobile'
    );
    res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error('Error fetching vendor members:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor members',
      error: err.message,
    });
  }
});

// Get member by welin ID
router.get('/welin/:welinId', async (req, res) => {
  try {
    const { welinId } = req.params;
    const member = await Member.findOne({ welinId }).populate(
      'vendorId',
      'name email mobile'
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    res.json({
      success: true,
      data: member,
    });
  } catch (err) {
    console.error('Error fetching member:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching member',
      error: err.message,
    });
  }
});

// Create new member
router.post('/', async (req, res) => {
  try {
    const memberData = req.body;

    // Validate vendor exists
    const vendor = await User.findById(memberData.vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID',
      });
    }

    // Generate Welin ID first
    const welinId = await WelinIdCounter.getNextId();

    // Create new member with generated Welin ID
    const member = new Member({
      ...memberData,
      welinId,
    });
    await member.save();

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: member,
    });
  } catch (err) {
    console.error('Error creating member:', err);

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
      message: 'Error creating member',
      error: err.message,
    });
  }
});

// Update member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate member exists
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // If vendorId is being updated, validate new vendor
    if (
      updateData.vendorId &&
      updateData.vendorId !== member.vendorId.toString()
    ) {
      const vendor = await User.findById(updateData.vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
        });
      }
    }

    // If welinId is being updated, check for duplicates
    if (updateData.welinId && updateData.welinId !== member.welinId) {
      const existingMember = await Member.findOne({
        welinId: updateData.welinId,
      });
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Member with this Welin ID already exists',
        });
      }
    }

    // Update member
    Object.assign(member, updateData);
    await member.save();

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: member,
    });
  } catch (err) {
    console.error('Error updating member:', err);

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
      message: 'Error updating member',
      error: err.message,
    });
  }
});

// Delete member (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate member exists
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // Hard delete
    await Member.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Member deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting member',
      error: err.message,
    });
  }
});

module.exports = router;
