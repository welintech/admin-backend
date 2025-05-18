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

  const { amount, return_url } = req.body;

  // Validate user object presence
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const order_id = generatePaymentId();

  const request = {
    order_amount: amount,
    order_currency: 'INR',
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

  return res.status(200).json({
    message: 'Order created successfully',
    data: order.data,
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
