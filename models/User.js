const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    minlength: [3, 'First name must be at least 3 characters'],
    match: [/^[A-Za-z]+$/, 'Only letters are allowed in first name']
  },
  lastName: {
    type: String,
    required: true,
    minlength: [3, 'Last name must be at least 3 characters'],
    match: [/^[A-Za-z]+$/, 'Only letters are allowed in last name']
  },
  email: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im, 'Please fill a valid phone number']
  },
  locality: String,
  profileImage: String,
  userType: {
    type: String,
    enum: ["customer", "store_owner"],
    default: "customer"
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ isDeleted: 1 });

module.exports = mongoose.model("User", userSchema);