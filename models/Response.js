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
    url: String,        // Cloudinary URL
    public_id: String   // Cloudinary public_id for deletion
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
  },

  // Notification fields for store owner
  notificationForStoreOwner: {
    type: Boolean,
    default: false
  },
  notificationTitle: {
    type: String
  },
  notificationMessage: {
    type: String
  },
  notificationType: {
    type: String,
    enum: ['quotation_accepted', 'quotation', 'system', null],
    default: null
  },
  isNotificationRead: {
    type: Boolean,
    default: false
  },
  notificationRecipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notificationSenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

// Indexes for better query performance
responseSchema.index({ requirementId: 1 });
responseSchema.index({ storeId: 1 });
responseSchema.index({ status: 1 });
responseSchema.index({ isDeleted: 1 });
// Compound index for common queries
responseSchema.index({ requirementId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Response", responseSchema);