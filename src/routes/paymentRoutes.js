const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const passport = require('passport');

// Validation middleware
const paymentValidation = [
  check('amount', 'Amount is required').not().isEmpty(),
  check('currency', 'Currency is required').not().isEmpty(),
  check('paymentMethod', 'Payment method is required').not().isEmpty(),
  check('status', 'Status is required').not().isEmpty(),
];

router.use(passport.authenticate('jwt', { session: false }));

// Protected routes
router.post('/', paymentValidation, paymentController.createPayment);
router.get('/', paymentController.getPayments);
router.get('/:id', paymentController.getPaymentById);
router.put('/:id', paymentValidation, paymentController.updatePayment);
router.delete('/:id', paymentController.deletePayment);

// Public route for QR code verification
router.post('/verify-qr/:paymentId', paymentController.verifyQRPayment);

module.exports = router;
