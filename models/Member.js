const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required'],
    },
    orgId: {
      type: String,
      trim: true,
    },
    welinId: {
      type: String,
      required: [true, 'Welin ID is required'],
      unique: true,
      trim: true,
    },
    memberName: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
    },
    contactNo: {
      type: String,
      required: [true, 'Contact number is required'],
      unique: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [0, 'Age cannot be negative'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: {
        type: String,
        match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode'],
      },
    },
    occupation: {
      type: String,
      trim: true,
    },
    documents: [
      {
        type: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    nominee: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      contactNo: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
      },
    },
    loanFlag: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Member', memberSchema);
