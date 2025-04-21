const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');

// Generate a unique payment ID
const generatePaymentId = () => {
  return `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// Generate a short URL (for demo purposes)
const generateShortUrl = (paymentId) => {
  return `https://welin.in/pay/${paymentId}`;
};

// @desc    Create a new payment
// @route   POST /api/payments
// @access  Private
exports.createPayment = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, currency, paymentMethod, description } = req.body;
  const paymentId = generatePaymentId();

  // If payment method is QR code, generate QR code
  if (paymentMethod === 'qr_code') {
    // For testing, use a simple text URL
    const paymentUrl = `Payment ID: ${paymentId}\nAmount: ${amount} ${currency}\nDescription: ${
      description || 'Payment'
    }`;

    try {
      const qrCodeData = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      const payment = new Payment({
        ...req.body,
        transactionId: paymentId,
        qrCode: {
          data: qrCodeData,
          url: paymentUrl,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        },
        user: req.user._id,
      });

      await payment.save();
      return res.status(201).json(payment);
    } catch (error) {
      console.error('Error generating QR code:', error);
      // If QR code generation fails, still create the payment but without QR code
      const payment = new Payment({
        ...req.body,
        transactionId: paymentId,
        user: req.user._id,
      });
      await payment.save();
      return res.status(201).json({
        ...payment.toObject(),
        qrCodeError: 'Failed to generate QR code',
      });
    }
  }

  // If payment method is payment link
  if (paymentMethod === 'payment_link') {
    const paymentUrl = generateShortUrl(paymentId);
    const payment = new Payment({
      ...req.body,
      transactionId: paymentId,
      paymentLink: {
        url: paymentUrl,
        shortUrl: paymentUrl, // In a real implementation, you might want to use a URL shortener service
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      user: req.user._id,
    });
    console.log(payment);

    await payment.save();
    return res.status(201).json(payment);
  }

  // For other payment methods
  const payment = new Payment({
    ...req.body,
    transactionId: paymentId,
    user: req.user._id,
  });

  await payment.save();
  res.status(201).json(payment);
});

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
exports.getPayments = catchAsync(async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
});

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
exports.getPaymentById = catchAsync(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }
  res.json(payment);
});

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
exports.updatePayment = catchAsync(async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }
  res.json(payment);
});

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
exports.deletePayment = catchAsync(async (req, res) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }
  res.json({ message: 'Payment deleted successfully' });
});

// @desc    Verify QR code payment
// @route   POST /api/payments/verify-qr/:paymentId
// @access  Public
exports.verifyQRPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.params;
  const payment = await Payment.findOne({ transactionId: paymentId });

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  if (payment.paymentMethod !== 'qr_code') {
    return res.status(400).json({ message: 'Not a QR code payment' });
  }

  if (payment.qrCode.expiresAt < new Date()) {
    return res.status(400).json({ message: 'QR code has expired' });
  }

  if (payment.status !== 'pending') {
    return res.status(400).json({ message: 'Payment already processed' });
  }

  // Here you would typically integrate with a payment gateway
  // For demo purposes, we'll simulate a successful payment
  payment.status = 'completed';
  await payment.save();

  res.json({
    message: 'Payment verified successfully',
    payment: {
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    },
  });
});
