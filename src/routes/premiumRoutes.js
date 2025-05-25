const express = require('express');
const router = express.Router();
const premiumController = require('../controllers/premiumController');
const { checkAdminRole } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an Excel file'), false);
    }
  },
});

// Import premium data from Excel (Admin only)
router.post(
  '/import',
  checkAdminRole('admin'),
  upload.single('file'),
  premiumController.importPremiumData
);

// Get premium amount for given loan amount and year
router.get('/', premiumController.getPremium);

module.exports = router;
