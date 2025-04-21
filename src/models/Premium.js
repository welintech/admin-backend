const mongoose = require('mongoose');

const premiumSchema = new mongoose.Schema(
  {
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [0, 'Loan amount cannot be negative'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1, 'Year must be at least 1'],
    },
    premiumAmount: {
      type: Number,
      required: [true, 'Premium amount is required'],
      min: [0, 'Premium amount cannot be negative'],
      get: (v) => Math.round(v),
      set: (v) => Math.round(v),
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for loanAmount and year
premiumSchema.index({ loanAmount: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Premium', premiumSchema);
