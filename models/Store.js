const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema({

  storeName: String,
  storeAddressLine: String,
  storeLocality: String,
  storePincode: String,
  storeCity: String,
  storeState: String,

  storeGmapUrl: String,
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  storeRatings: {
    type: Number,
    default: 0
  },
  storeKm: {
    type: String,
    default: ""
  },
  storeCategory: String,

  storeContact: String,
  storeEmail: String,

  // Store image field
  storeImage: {
    type: String,
    default: ""
  },

  storeOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Store", storeSchema);