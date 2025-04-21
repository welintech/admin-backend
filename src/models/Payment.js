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
  description: {
    type: String,
  },
  // QR Code specific fields
  qrCode: {
    data: String, // Base64 encoded QR code image
    url: String, // Payment URL encoded in QR code
    expiresAt: Date, // QR code expiration time
  },
  // Payment Link specific fields
  paymentLink: {
    url: String, // Payment link URL
    expiresAt: Date, // Link expiration time
    shortUrl: String, // Optional shortened URL
  },
  metadata: {
    type: Map,
    of: String,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

module.exports = mongoose.model('Payment', paymentSchema);
