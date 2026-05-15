const mongoose = require("mongoose");

const reqDocSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^image\/.+$/.test(v) || /^video\/.+$/.test(v) || v === 'application/pdf';
      },
      message: props => `${props.value} is not a valid file type!`
    }
  },
  url: { type: String, required: true },
  public_id: { type: String, required: true }
});

const requirementSchema = new mongoose.Schema({
  reqCategory: {
    type: String,
    required: true,
    enum: ['Pharmacy', 'Hardware', 'Electronics', 'Stationery', 'Cosmetic']
  },
  reqTitle: {
    type: String,
    required: true,
    minlength: 5
  },
  reqDocs: [reqDocSchema],
  reqDesc: {
    type: String,
    required: true
  },
  reqAudio: String,
  deadLineDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v >= new Date().setHours(0,0,0,0);
      },
      message: props => `Deadline date must be today or a future date`
    }
  },
  targetLocation: {
    type: String,
    required: true
  },
  city: String,
  deliveryDate: {
    type: Date,
    validate: [
      {
        validator: function(v) {
          return !v || v >= new Date().setHours(0,0,0,0);
        },
        message: props => `Delivery date must be today or a future date`
      },
      {
        validator: function(v) {
          // deliveryDate must be >= deadLineDate
          if (v && this.deadLineDate && v < this.deadLineDate) {
            return false;
          }
          return true;
        },
        message: props => `Expected Delivery Date must be on or after Quotation Deadline`
      }
    ]
  },
  reqStatus: {
    type: String,
    enum: ["Open", "In-Review", "Closed"],
    default: "Open"
  },
   expectedBudget: {
     type: Number,
     required: true
   },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userType: {
    type: String,
    enum: ["customer", "store_owner"],
    required: true
  },
  reqOwner: String,
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