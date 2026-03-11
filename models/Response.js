const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({

  reqId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement"
  },

  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
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