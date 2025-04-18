const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
UserSchema.pre('init', async function () {
  try {
    await mongoose.connection.db.collection('users').dropIndex('username_1');
  } catch (err) {
    // Index might not exist, which is fine
    if (err.code !== 27) {
      // 27 is the error code for "index not found"
      console.error('Error dropping old username index:', err);
    }
  }
});

// Hash password before saving
UserSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();

  bcrypt.hash(this.password, 10, (err, hashedPassword) => {
    if (err) return next(err);
    this.password = hashedPassword;
    next();
  });
});

// Compare password
UserSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

// Create the model
const User = mongoose.model('User', UserSchema);

// Ensure indexes are created
User.createIndexes().catch((err) => {
  console.error('Error creating indexes:', err);
});

module.exports = User;
