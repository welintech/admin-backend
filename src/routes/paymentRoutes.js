const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const passport = require('passport');
const Payment = require('../models/Payment');
const LoanCover = require('../models/LoanCover');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Validation middleware
const paymentValidation = [
  check('amount', 'Amount is required').not().isEmpty(),
  check('return_url', 'Return url is required').not().isEmpty(),
];

// Payment data validation
const paymentDataValidation = [
  check('amount', 'Amount is required').not().isEmpty(),
  check('transactionId', 'Transaction ID is required').not().isEmpty(),
  check('product.type', 'Product type is required').not().isEmpty(),
  check('product.productId', 'Product ID is required').not().isEmpty(),
];

router.use(passport.authenticate('jwt', { session: false }));

// Protected routes
router.post('/', paymentValidation, paymentController.createOrder);
router.get('/order/:orderId', paymentController.getOrderDetails);

// Save payment data after successful payment
router.post(
  '/success',
  paymentDataValidation,
  catchAsync(async (req, res) => {
    const { amount, transactionId, product } = req.body;

    // Check if payment with this transaction ID already exists
    const existingPayment = await Payment.findOne({ transactionId });
    if (existingPayment) {
      throw new AppError(
        'Payment with this transaction ID already exists',
        400
      );
    }

    // Start a session for transaction
    const session = await Payment.startSession();
    session.startTransaction();

    try {
      // Create new payment record
      const payment = new Payment({
        amount,
        transactionId,
        product,
        status: 'completed',
      });

      await payment.save({ session });

      // Update product status based on product type
      if (product.type === 'loneCover') {
        const loanCover = await LoanCover.findById(product.productId);
        if (!loanCover) {
          throw new AppError('Loan cover not found', 404);
        }

        // Update loan cover payment status
        loanCover.payment = {
          status: 'paid',
          date: new Date(),
          transactionId: transactionId,
        };

        await loanCover.save({ session });
      }

      // If everything is successful, commit the transaction
      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: 'Payment data saved successfully',
        data: {
          payment,
          product:
            product.type === 'loneCover'
              ? await LoanCover.findById(product.productId)
              : null,
        },
      });
    } catch (error) {
      // If any error occurs, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  })
);

module.exports = router;
