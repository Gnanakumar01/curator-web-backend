const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^image\/.+$/.test(v) || /^video\/.+$/.test(v);
      },
      message: props => `${props.value} is not a valid file type! Only images and videos are allowed.`
    }
  },
  url: { type: String, required: true },
  public_id: { type: String, required: true }
});

const responseSchema = new mongoose.Schema({
  requirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement",
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },
  price: {
    type: Number,
    required: true,
    // min: [1, 'Price must be at least 1']
  },
  deliveryTime: {
    type: Number,
    required: true,
    // min: [1, 'Delivery time must be at least 1']
  },
  deliveryTimeUnit: {
    type: String,
    required: true,
    enum: ['hours', 'days', 'weeks']
  },
  message: {
    type: String,
    required: true,
    minlength: [20, 'Message must be at least 20 characters']
  },
  distance: Number,
  attachments: [attachmentSchema],
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
    enum: ['quotation_accepted', 'quotation', 'system', 'quotation_deleted', null],
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