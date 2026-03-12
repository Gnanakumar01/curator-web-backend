const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema({

  // Price field
  price: {
    type: Number,
    required: true
  },

  // Delivery time field
  deliveryTime: {
    type: String,
    required: true
  },

  // Distance field
  distance: {
    type: String,
    required: true
  },

  // Message field
  message: {
    type: String,
    default: ""
  },

  // Uploaded files (array of file paths/URLs)
  uploadedFiles: [{
    type: String
  }],

  // Reference to the user who created the quotation
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // Reference to the requirement this quotation is for
  requirement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement"
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Quotation", quotationSchema);
