const express = require('express');
const Member = require('../models/Member');
const User = require('../models/User');
const LoanCover = require('../models/LoanCover');
const WelinIdCounter = require('../models/WelinIdCounter');
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

// Get members by agent ID
router.get(
  '/agent/:agentId',
  catchAsync(async (req, res) => {
    const { agentId } = req.params;

    // Validate agent exists
    const agent = await User.findById(agentId);
    if (!agent || agent.role.role !== 'agent') {
      throw new AppError('Agent not found', 404);
    }

    // Get all members created by this agent
    const members = await Member.find({ agent: agentId })
      .populate('vendorId', 'name email mobile')
      .populate('agent', 'name email mobile')
      .populate({
        path: 'products.productId',
        select:
          'loanAmount coverageStartDate coverageEndDate basePremium gst totalPremium status',
      });

    res.json({
      success: true,
      data: members,
    });
  })
);

// Helper function to create loan cover
const createLoanCover = async (memberId, loanData) => {
  const loanCover = new LoanCover({
    memberId,
    loanAmount: loanData.amount,
    coverageStartDate: loanData.startDate,
    coverageEndDate: loanData.endDate,
    basePremium: loanData.basePremium,
    gst: loanData.gst,
    totalPremium: loanData.totalPremium,
    payment: {
      status: 'pending',
    },
    status: 'active',
  });

  await loanCover.save();
  return loanCover;
};

// Helper function to add product to member
const addProductToMember = async (member, productType, productId) => {
  member.products.push({
    type: productType,
    productId,
    paymentStatus: false,
  });
  await member.save();
};

// Create new member
router.post(
  '/',
  catchAsync(async (req, res) => {
    const memberData = req.body;
    const loanData = req.body.loan;

    // Get vendor ID based on user role
    let vendorId;
    if (req.user.role.role === 'agent') {
      vendorId = req.user.vendorId;
    } else if (req.user.role.role === 'vendor') {
      vendorId = req.user._id;
    } else {
      throw new AppError('Only vendors and agents can create members', 403);
    }

    // Validate vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role.role !== 'vendor') {
      throw new AppError('Invalid vendor ID', 400);
    }

    // Generate Welin ID first
    const welinId = await WelinIdCounter.getNextId();

    // Create new member with generated Welin ID
    const member = new Member({
      ...memberData,
      welinId,
      vendorId,
      agent: req.user._id,
      password: memberData.password || 'password',
      age: memberData.age || calculateAge(memberData.dob),
    });

    await member.save();

    // Handle loan cover if provided
    let loanCover = null;
    if (loanData) {
      loanCover = await createLoanCover(member._id, loanData);
      await addProductToMember(member, 'loneCover', loanCover._id);
    }

    // Remove password from response
    const memberResponse = member.toObject();
    delete memberResponse.password;

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: {
        ...memberResponse,
        loanCover: loanCover,
      },
    });
  })
);

// Helper function to calculate age from DOB
function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

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

// Get member products by member ID
router.get(
  '/:memberId/products',
  catchAsync(async (req, res) => {
    const { memberId } = req.params;

    // Validate member exists
    const member = await Member.findById(memberId);
    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // Get all products with their details
    const products = await Promise.all(
      member.products.map(async (product) => {
        let productDetails = null;

        if (product.type === 'loneCover') {
          productDetails = await LoanCover.findById(product.productId);
        } else if (product.type === 'healthCover') {
          // Add health cover model when available
          // productDetails = await HealthCover.findById(product.productId);
        }

        return {
          type: product.type,
          paymentStatus: product.paymentStatus,
          details: productDetails,
        };
      })
    );

    res.json({
      success: true,
      data: products,
    });
  })
);

module.exports = router;
