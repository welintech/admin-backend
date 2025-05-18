const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const Member = require('../models/Member');
const { Cashfree, CFEnvironment } = require('cashfree-pg');

// Generate a unique payment ID
const generatePaymentId = () => {
  return `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// @desc    Create a new payment order
// @route   POST /api/payments
// @access  Private
exports.createOrder = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const env = isProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  const app_id = isProduction
    ? process.env.CASHFREE_APP_ID
    : process.env.CASHFREE_APP_ID_TEST;
  const secret_key = process.env.CASHFREE_SECRET_KEY;

  const cashfree = new Cashfree(env, app_id, secret_key);

  const { amount, currency, return_url, product } = req.body;

  // Validate user object presence
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const order_id = generatePaymentId();

  const request = {
    order_amount: amount,
    order_currency: currency,
    order_id,
    customer_details: {
      customer_id: req.user._id,
      customer_phone: req.user.mobile,
      customer_name: req.user.first_name,
      customer_email: req.user.email,
    },
    order_meta: {
      return_url: `${return_url}/${order_id}`,
    },
  };

  const order = await cashfree.PGCreateOrder(request);

  // Create payment record in database
  // const payment = await Payment.create({
  //   orderId: order_id,
  //   amount,
  //   currency,
  //   status: 'pending',
  //   paymentMethod: 'cashfree',
  //   user: req.user._id,
  //   product: {
  //     productId: product.productId,
  //     type: product.type,
  //   },
  // });

  return res.status(200).json({
    message: 'Order created successfully',
    data: {
      ...order.data,
      // paymentId: payment._id,
    },
  });
});

exports.getOrderDetails = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const env = isProduction ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
  const app_id = isProduction
    ? process.env.CASHFREE_APP_ID
    : process.env.CASHFREE_APP_ID_TEST;
  const secret_key = process.env.CASHFREE_SECRET_KEY;

  const cashfree = new Cashfree(env, app_id, secret_key);

  try {
    const response = await cashfree.PGOrderFetchPayments(orderId);
    res.status(200).json({
      message: 'Payment details fetched successfully',
      data: response.data[0],
    });
  } catch (error) {
    console.error('Cashfree API Error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to fetch payment details',
      error: error.response?.data || error.message,
    });
  }
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
  const { status, memberId } = req.body;

  // Update payment status
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!payment) {
    return res.status(404).json({ message: 'Payment not found' });
  }

  // If payment is successful, update member's product payment status
  if (status === 'completed' && memberId && payment.product?.productId) {
    await Member.findOneAndUpdate(
      {
        _id: memberId,
        'products.productId': payment.product.productId,
      },
      {
        $set: {
          'products.$.paymentStatus': true,
        },
      }
    );
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
