const express = require('express');
const router = express.Router();
const loanCoverController = require('../controllers/loanCoverController');
const { checkAdminRole } = require('../middleware/auth');

// Create new loan cover
router.post('/', checkAdminRole('vendor'), loanCoverController.createLoanCover);

// Get loan cover by ID
router.get('/:id', loanCoverController.getLoanCover);

// Get all loan covers for a member
router.get('/member/:memberId', loanCoverController.getMemberLoanCovers);


module.exports = router;
