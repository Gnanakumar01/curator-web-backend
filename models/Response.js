const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({

  requirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement"
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  },

  // Quotation details from frontend
  price: Number,
  deliveryTime: Number,
  deliveryTimeUnit: String,
  distance: Number,
  message: String,
  attachments: [{
    fileName: String,
    fileType: String,
    data: String // Base64 encoded file data
  }],
  status: {
    type: String,
    default: 'Pending'
  },
  acceptMessage: {
    type: String
  },
  acceptedAt: {
    type: Date
  },

  // Legacy fields
  resId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement"
  },

  responseStat: {
    type: String,
    enum: ["Interested", "Not Interested"]
  },

  resDocs: String,
  resAudio: String,

  deadlineDate: Date,
  deliveryDays: Number,

  estimatedBudget: Number,

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Response", responseSchema);