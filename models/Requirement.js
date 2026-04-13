const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({

  reqCategory: String,
  reqTitle: String,
  reqDocs: [{
    fileName: String,
    fileType: String,
    data: String // Base64 encoded file data
  }],
  reqDesc: String,
  reqAudio: String,

  deadLineDate: Date,
  targetLocation: String,
  city: String,
  deliveryDate: Date,

  reqStatus: {
    type: String,
    enum: ["Open", "In-Review", "Closed"],
    default: "Open"
  },

  expectedBudget: Number,

  // ✅ ADD THIS
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // ✅ ADD THIS
  userType: {
    type: String,
    enum: ["customer", "store_owner"],
    required: true
  },

  reqOwner: String, // change from ObjectId → string (you are passing name)

  isDeleted: {
    type: Boolean,
    default: false
  },

  favResponses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Response"
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Requirement", requirementSchema);