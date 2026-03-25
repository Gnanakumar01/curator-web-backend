const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
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

module.exports = mongoose.model("User", userSchema);