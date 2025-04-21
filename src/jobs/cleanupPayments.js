const Payment = require('../models/Payment');
const catchAsync = require('../utils/catchAsync');

// Cleanup unpaid payments
const cleanupUnpaidPayments = catchAsync(async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Find and delete unpaid payments older than 5 minutes
  const result = await Payment.deleteMany({
    status: 'pending',
    createdAt: { $lt: fiveMinutesAgo },
  });

  if (result.deletedCount > 0) {
    console.log(
      `Cleaned up ${result.deletedCount} unpaid payments older than 5 minutes`
    );
  }
});

// Run cleanup every minute
setInterval(cleanupUnpaidPayments, 60 * 1000);

// Export for testing
module.exports = {
  cleanupUnpaidPayments,
};
