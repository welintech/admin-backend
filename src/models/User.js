const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
    },
    role: {
      type: String,
      enum: ['admin', 'vendor', 'user'],
      required: [true, 'Role is required'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Drop old username index if it exists
UserSchema.pre(
  'init',
  catchAsync(async function () {
    try {
      await mongoose.connection.db.collection('users').dropIndex('username_1');
    } catch (err) {
      // Only throw error if it's not an "index not found" error
      if (err.code !== 27) {
        throw new AppError(`Error dropping index: ${err.message}`, 500);
      }
      // Silently continue if index doesn't exist
    }
  })
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (err) {
    throw new AppError('Error hashing password', 500);
  }
});

// Compare password
UserSchema.methods.comparePassword = function (password) {
  try {
    return bcrypt.compareSync(password, this.password);
  } catch (err) {
    throw new AppError('Error comparing passwords', 500);
  }
};

// Create the model
const User = mongoose.model('User', UserSchema);

// Ensure indexes are created
User.createIndexes().catch((err) => {
  throw new AppError(`Error creating indexes: ${err.message}`, 500);
});

module.exports = User;
