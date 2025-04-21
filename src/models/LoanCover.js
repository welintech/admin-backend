const mongoose = require('mongoose');

const loanCoverSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member ID is required'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required'],
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount cannot be negative'],
    },
    coverageStartDate: {
      type: Date,
      required: [true, 'Coverage start date is required'],
    },
    coverageEndDate: {
      type: Date,
      required: [true, 'Coverage end date is required'],
    },
    // Premium Details
    basePremium: {
      type: Number,
      required: [true, 'Base premium is required'],
      min: [0, 'Base premium cannot be negative'],
    },
    gst: {
      type: Number,
      required: [true, 'GST is required'],
      min: [0, 'GST cannot be negative'],
    },
    totalPremium: {
      type: Number,
      required: [true, 'Total premium is required'],
      min: [0, 'Total premium cannot be negative'],
    },
    // Optional fields
    payment: {
      status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending',
      },
      date: Date,
      transactionId: String,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
loanCoverSchema.index({ memberId: 1, status: 1 });
loanCoverSchema.index({ vendorId: 1, status: 1 });

// Virtual field to calculate term in years
loanCoverSchema.virtual('term').get(function () {
  return Math.round(
    (this.coverageEndDate - this.coverageStartDate) /
      (365 * 24 * 60 * 60 * 1000)
  );
});

module.exports = mongoose.model('LoanCover', loanCoverSchema);
