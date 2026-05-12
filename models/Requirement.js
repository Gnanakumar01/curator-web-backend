const mongoose = require("mongoose");

const requirementSchema = new mongoose.Schema({

  reqCategory: String,
  reqTitle: String,
  reqDocs: [{
    fileName: String,
    fileType: String,
    url: String,        // Cloudinary URL
    public_id: String   // Cloudinary public_id for deletion
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

// Indexes for better query performance
requirementSchema.index({ createdBy: 1 });
requirementSchema.index({ reqCategory: 1 });
requirementSchema.index({ targetLocation: 1 });
requirementSchema.index({ city: 1 });
requirementSchema.index({ isDeleted: 1 });
requirementSchema.index({ reqStatus: 1 });
// Compound index for common queries
requirementSchema.index({ reqCategory: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model("Requirement", requirementSchema);