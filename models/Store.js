const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({

  storeName: String,
  storeAddressLine: String,
  storeLocality: String,
  storePincode: String,
  storeCity: String,
  storeState: String,

  storeGmapUrl: String,
  storeRatings: Number,
  storeCategory: String,

  storeContact: String,
  storeEmail: String,

  storeOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Store", storeSchema);