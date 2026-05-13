const mongoose = require("mongoose");

// Helper to validate Cloudinary/URL format
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Helper to validate array of URLs
const isValidUrlArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.every(url => isValidUrl(url));
};

const storeSchema = new mongoose.Schema({
  storeName: {
    type: String,
    required: true
  },
  storeAddressLine: {
    type: String,
    required: true
  },
  storeLocality: {
    type: String,
    required: true
  },
  storePincode: {
    type: String,
    required: true,
    match: [/^\d{6}$/, 'Please enter valid 6-digit pincode']
  },
  storeCity: {
    type: String,
    required: true,
    default: "Bengaluru"
  },
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
  
  // storeRatings: {
  //   type: Number,
  //   default: 0,
  //   min: [0, 'Rating cannot be negative'],
  //   max: [5, 'Rating cannot exceed 5']
  // },
  storeKm: {
    type: String,
    default: ""
  },
  storeCategory: {
    type: String,
    required: true,
    enum: ['Pharmacy', 'Hardware', 'Electronics', 'Stationery', 'Cosmetic']
  },
  
  storeContact: {
    type: String,
    required: true
  },
  storeEmail: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    lowercase: true,
    trim: true
  },
  
  // Store image field (single image, max 5MB, compressed to ~1MB)
  storeImage: {
    type: String,
    required: true,
    validate: {
      validator: isValidUrl,
      message: 'Please provide a valid URL for store image'
    }
  },
  
  // Attached files field (gallery images/videos, each max 5MB images/10MB videos)
  storeAttachedFiles: {
    type: [String],
    required: true,
    validate: {
      validator: isValidUrlArray,
      message: 'Please upload valid gallery images or videos'
    }
  },
  
  // Identity proof field (license/GST certificate, PDF max 5MB)
  storeProof: {
    type: String,
    default: "",
    validate: {
      validator: function(v) {
        // Allow empty string (optional field)
        if (!v) return true;
        return isValidUrl(v);
      },
      message: 'Please provide a valid URL for store proof'
    }
  },
  
  // Store owner ID proof field (Aadhaar, PAN, etc.) - multiple images
  storeOwnerIdProof: {
    type: [String],
    required: true,
    validate: {
      validator: isValidUrlArray,
      message: 'Please upload valid owner ID proof images'
    }
  },
  
  storeOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// 2dsphere index for geospatial queries
storeSchema.index({ location: "2dsphere" });

// Indexes for better query performance
storeSchema.index({ storeCategory: 1 });
storeSchema.index({ storeOwner: 1 });
storeSchema.index({ storeCity: 1 });
storeSchema.index({ isDeleted: 1 });
// Compound index for common queries
storeSchema.index({ storeCategory: 1, isDeleted: 1, storeRatings: -1 });

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