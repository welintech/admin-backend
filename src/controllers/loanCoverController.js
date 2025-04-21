const LoanCover = require('../models/LoanCover');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Create new loan cover
exports.createLoanCover = catchAsync(async (req, res, next) => {
  const {
    memberId,
    vendorId,
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
    vendorId,
    loanAmount,
    coverageStartDate,
    coverageEndDate,
    basePremium,
    gst,
    totalPremium,
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

// Get all loan covers for a vendor
exports.getVendorLoanCovers = catchAsync(async (req, res, next) => {
  const loanCovers = await LoanCover.find({ vendorId: req.params.vendorId })
    .populate('memberId', 'memberName contactNo email')
    .populate('vendorId', 'name');

  res.status(200).json({
    status: 'success',
    results: loanCovers.length,
    data: loanCovers,
  });
});

// Update payment details
exports.updatePayment = catchAsync(async (req, res, next) => {
  const { status, date, transactionId } = req.body;

  const loanCover = await LoanCover.findById(req.params.id);

  if (!loanCover) {
    throw new AppError('Loan cover not found', 404);
  }

  loanCover.payment = {
    status,
    date,
    transactionId,
  };

  await loanCover.save();

  res.status(200).json({
    status: 'success',
    data: loanCover,
  });
});
