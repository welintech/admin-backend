const mongoose = require('mongoose');

const welinIdCounterSchema = new mongoose.Schema(
  {
    prefix: {
      type: String,
      required: true,
      unique: true,
      default: 'WELIN',
    },
    lastId: {
      type: Number,
      required: true,
      default: 0,
    },
    year: {
      type: String,
      required: true,
      default: () => new Date().getFullYear().toString(),
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get next ID
welinIdCounterSchema.statics.getNextId = async function () {
  const currentYear = new Date().getFullYear().toString();

  // Find or create counter for current year
  let counter = await this.findOne({ year: currentYear });
  if (!counter) {
    counter = await this.create({ year: currentYear });
  }

  // Increment and save
  counter.lastId += 1;
  await counter.save();

  // Format: WELIN-YYYY-XXXXX (5 digits)
  const paddedId = counter.lastId.toString().padStart(5, '0');
  return `${counter.prefix}-${currentYear}-${paddedId}`;
};

module.exports = mongoose.model('WelinIdCounter', welinIdCounterSchema);
