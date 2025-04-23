const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: [
      'credit_card',
      'debit_card',
      'net_banking',
      'upi',
      'wallet',
      'qr_code',
      'payment_link',
    ],
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  transactionId: {
    type: String,
    unique: true,
  },
  product: {
    type: {
      type: String,
      enum: ['loneCover', 'healthCover'],
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Add field for TTL index
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    index: { expires: 0 }, // TTL index
  },
});

// Update the updatedAt field before saving
paymentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  // Only set expiresAt for pending payments
  if (this.status === 'pending') {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  } else {
    this.expiresAt = null; // Remove expiration for completed/failed payments
  }
  next();
});

paymentSchema.pre(/^findOneAnd/, function (next) {
  const update = this.getUpdate();

  // Make sure you're updating the `updatedAt` field
  if (!update.$set) {
    update.$set = {};
  }

  update.$set.updatedAt = new Date();

  // Check status (in update) and adjust expiresAt accordingly
  const status = update.status || update.$set.status;

  if (status === 'pending') {
    update.$set.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // TTL for pending
  } else {
    update.$set.expiresAt = null; // Prevent TTL deletion
  }

  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
