const LoanCover = require('../models/LoanCover');
const Member = require('../models/Member');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Create new loan cover
exports.createLoanCover = catchAsync(async (req, res, next) => {
  const {
    memberId,
    loanAmount,
    coverageStartDate,
    coverageEndDate,
    basePremium,
    gst,
    totalPremium,
  } = req.body;

  // Basic validation
  if (totalPremium !== basePremium + gst) {
    throw new AppError('Total premium must equal base premium plus GST', 400);
  }

  // Check for existing active loan cover for this member
  const existingActiveLoanCover = await LoanCover.findOne({
    memberId,
    status: 'active',
  });

  if (existingActiveLoanCover) {
    return res.status(200).json({
      status: 'success',
      data: existingActiveLoanCover,
    });
  }

  const loanCover = await LoanCover.create({
    memberId,
    loanAmount,
    coverageStartDate,
    coverageEndDate,
    basePremium,
    gst,
    totalPremium,
  });

  await Member.findByIdAndUpdate(memberId, {
    $push: {
      products: {
        type: 'loneCover',
        productId: loanCover._id,
        paymentStatus: false,
      },
    },
  });

  res.status(201).json({
    status: 'success',
    data: loanCover,
  });
});

// Get loan cover by ID
exports.getLoanCover = catchAsync(async (req, res, next) => {
  const loanCover = await LoanCover.findById(req.params.id)
    .populate('memberId', 'memberName contactNo email')
    .populate('vendorId', 'name');

  if (!loanCover) {
    throw new AppError('Loan cover not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: loanCover,
  });
});

// Get all loan covers for a member
exports.getMemberLoanCovers = catchAsync(async (req, res, next) => {
  const loanCovers = await LoanCover.find({ memberId: req.params.memberId })
    .populate('memberId', 'memberName contactNo email')
    .populate('vendorId', 'name');

  res.status(200).json({
    status: 'success',
    results: loanCovers.length,
    data: loanCovers,
  });
});
