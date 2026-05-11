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
  // Geospatial field for location-based queries
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      default: [null, null] // [longitude, latitude]
    }
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

  // Attached files field
  storeAttachedFiles: {
    type: [String],
    default: []
  },

  // Identity proof field (license/GST certificate)
  storeProof: {
    type: String,
    default: ""
  },

  // Store owner ID proof field (Aadhaar, PAN, etc.) - multiple images
  storeOwnerIdProof: {
    type: [String],
    default: []
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

// 2dsphere index for geospatial queries
storeSchema.index({ location: "2dsphere" });

// Pre-save hook to keep location in sync with latitude/longitude
// Using function syntax to preserve 'this' context
storeSchema.pre("save", function() {
  // Check for null/undefined (0 is valid)
  if (this.latitude != null && this.longitude != null) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude]
    };
  } else {
    this.location = undefined;
  }
  // In Mongoose 9.x, we don't need to call next() explicitly
  // The hook will complete automatically
});

module.exports = mongoose.model("Store", storeSchema);