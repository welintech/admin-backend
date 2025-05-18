const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const passport = require('passport');

// Validation middleware
const paymentValidation = [
  check('amount', 'Amount is required').not().isEmpty(),
  check('return_url', 'Return url is required').not().isEmpty(),
];

router.use(passport.authenticate('jwt', { session: false }));

// Protected routes
router.post('/', paymentValidation, paymentController.createOrder);
router.get('/order/:orderId', paymentController.getOrderDetails);

module.exports = router;
