const Premium = require('../models/Premium');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const xlsx = require('xlsx');

// Import premium data from Excel
exports.importPremiumData = catchAsync(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('Please upload an Excel file', 400);
  }

  const workbook = xlsx.read(req.file.buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  // Transform data into required format
  const transformedData = [];

  // Skip header row (index 0)
  for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
    const row = rawData[rowIndex];
    const loanAmount = Number(row[0]); // First column is loan amount

    // Start from column 1 (index 1) as column 0 is loan amount
    for (let yearIndex = 1; yearIndex < row.length; yearIndex++) {
      const year = yearIndex; // Column number represents the year
      const premiumAmount = Number(row[yearIndex]);

      if (!isNaN(loanAmount) && !isNaN(premiumAmount)) {
        transformedData.push({
          loanAmount,
          year,
          premiumAmount: Math.round(premiumAmount), // Round to nearest integer
        });
      }
    }
  }

  if (transformedData.length === 0) {
    throw new AppError('No valid data found in the Excel file', 400);
  }

  // Check for existing data
  const existingData = await Premium.countDocuments({
    $or: transformedData.map((data) => ({
      loanAmount: data.loanAmount,
      year: data.year,
    })),
  });

  // Insert transformed data into database
  // Use updateMany with upsert to handle duplicates
  const operations = transformedData.map((data) => ({
    updateOne: {
      filter: { loanAmount: data.loanAmount, year: data.year },
      update: { $set: data },
      upsert: true,
    },
  }));

  const result = await Premium.bulkWrite(operations);

  res.status(200).json({
    status: 'success',
    message:
      existingData > 0
        ? 'Premium data updated successfully'
        : 'Premium data imported successfully',
    data: {
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
      total: transformedData.length,
      existing: existingData,
      new: transformedData.length - existingData,
    },
  });
});

// Get premium amount for given loan amount and year
exports.getPremium = catchAsync(async (req, res, next) => {
  const { loanAmount, year } = req.query;

  if (!loanAmount || !year) {
    throw new AppError('Loan amount and year are required', 400);
  }

  const requestedLoanAmount = Number(loanAmount);
  const requestedYear = Number(year);

  // First try to find exact match
  let premium = await Premium.findOne({
    loanAmount: requestedLoanAmount,
    year: requestedYear,
  });

  // If exact match not found, find next higher loan amount
  if (!premium) {
    premium = await Premium.findOne({
      loanAmount: { $gt: requestedLoanAmount },
      year: requestedYear,
    }).sort({ loanAmount: 1 }); // Get the smallest amount greater than requested
  }

  if (!premium) {
    throw new AppError(
      'Premium data not found for the given loan amount and year',
      404
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      requestedLoanAmount,
      actualLoanAmount: premium.loanAmount,
      year: premium.year,
      premiumAmount: premium.premiumAmount,
      isExactMatch: premium.loanAmount === requestedLoanAmount,
    },
  });
});
