const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({

  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["quotation", "system", "favorite", "quotation_accepted"],
    default: "system"
  },

  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedModel"
  },

  relatedModel: {
    type: String,
    enum: ["Requirement", "Response", "Store"]
  },

  isRead: {
    type: Boolean,
    default: false
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
