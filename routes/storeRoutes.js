const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const mongoose = require("mongoose");

// Wrapper for async route handlers to catch errors properly in Express 5.x
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ---------------------------------------------------------------------------
// Safely import geocoding utils — if the module is broken/missing,
// we fall back to no-ops so the rest of the route still works.
// ---------------------------------------------------------------------------
let geocodeAddress = async () => ({ latitude: null, longitude: null });
let buildFullAddress = () => "";

try {
  const geocoding = require("../utils/geocoding");
  if (typeof geocoding.geocodeAddress === "function") geocodeAddress = geocoding.geocodeAddress;
  if (typeof geocoding.buildFullAddress === "function") buildFullAddress = geocoding.buildFullAddress;
} catch (e) {
  console.warn("geocoding utils not available, skipping geocoding:", e.message);
}

// ---------------------------------------------------------------------------
// Helper: extract lat/lng from a Google Maps URL
// ---------------------------------------------------------------------------
const extractCoordinates = (gmapUrl) => {
  if (!gmapUrl) return { latitude: null, longitude: null };

  const latLngMatch = gmapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (latLngMatch) {
    return {
      latitude: parseFloat(latLngMatch[1]),
      longitude: parseFloat(latLngMatch[2]),
    };
  }

  const queryMatch = gmapUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (queryMatch) {
    return {
      latitude: parseFloat(queryMatch[1]),
      longitude: parseFloat(queryMatch[2]),
    };
  }

  return { latitude: null, longitude: null };
};

// ---------------------------------------------------------------------------
// Helper: resolve coordinates from request data
// ---------------------------------------------------------------------------
const resolveCoordinates = async (storeData) => {
  let latitude = null;
  let longitude = null;

  // 1. Directly provided
  if (storeData.latitude && storeData.longitude) {
    latitude = parseFloat(storeData.latitude);
    longitude = parseFloat(storeData.longitude);
  }

  // 2. Extract from Google Maps URL
  if (!latitude || !longitude) {
    const extracted = extractCoordinates(
      storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl
    );
    latitude = extracted.latitude;
    longitude = extracted.longitude;
  }

  // 3. Nominatim geocoding fallback
  if (!latitude || !longitude) {
    try {
      const fullAddress = buildFullAddress({
        storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
        storeLocality:    storeData.storeLocality || storeData.locality || storeData.area,
        storeCity:        storeData.storeCity || storeData.city,
        storeState:       storeData.storeState || storeData.state,
        storePincode:     storeData.storePincode || storeData.pincode || storeData.pinCode,
      });

      if (fullAddress) {
        console.log("Attempting Nominatim geocoding for:", fullAddress);
        const geocoded = await geocodeAddress(fullAddress);
        if (geocoded && geocoded.latitude && geocoded.longitude) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          console.log("Nominatim geocoding successful:", latitude, longitude);
        }
      }
    } catch (geoErr) {
      // Non-fatal — store can be saved without coordinates
      console.warn("Geocoding failed (non-fatal):", geoErr.message);
    }
  }

  // Sanitize NaN
  if (typeof latitude === "number" && isNaN(latitude)) latitude = null;
  if (typeof longitude === "number" && isNaN(longitude)) longitude = null;

  return { latitude, longitude };
};

// ---------------------------------------------------------------------------
// Helper: validate file URLs for security and integrity
// ---------------------------------------------------------------------------
const validateFileUrls = (data) => {
  const errors = [];

  // Validate storeImage (single URL)
  if (data.storeImage) {
    if (typeof data.storeImage !== 'string' || !data.storeImage.startsWith('http')) {
      errors.push('storeImage must be a valid URL');
    }
  }

  // Validate storeAttachedFiles (array of URLs)
  if (data.storeAttachedFiles && Array.isArray(data.storeAttachedFiles)) {
    if (data.storeAttachedFiles.length === 0) {
      errors.push('storeAttachedFiles must contain at least one file');
    }
    data.storeAttachedFiles.forEach((url, index) => {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        errors.push(`storeAttachedFiles[${index}] must be a valid URL`);
      }
    });
  }

  // Validate storeProof (single URL, optional)
  if (data.storeProof) {
    if (typeof data.storeProof !== 'string' || !data.storeProof.startsWith('http')) {
      errors.push('storeProof must be a valid URL');
    }
  }

  // Validate storeOwnerIdProof (array of URLs)
  if (data.storeOwnerIdProof && Array.isArray(data.storeOwnerIdProof)) {
    if (data.storeOwnerIdProof.length === 0) {
      errors.push('storeOwnerIdProof must contain at least one file');
    }
    data.storeOwnerIdProof.forEach((url, index) => {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        errors.push(`storeOwnerIdProof[${index}] must be a valid URL`);
      }
    });
  }

  return errors;
};

// ---------------------------------------------------------------------------
// Helper: build the final store document from raw request body
// ---------------------------------------------------------------------------
const buildStoreData = async (body) => {
  const { _id, ...storeData } = body;

  const storeOwner = storeData.storeOwner || storeData.ownerId || null;
  if (storeOwner && !mongoose.Types.ObjectId.isValid(storeOwner)) {
    throw Object.assign(new Error("Invalid store owner ID"), { statusCode: 400 });
  }

  const { latitude, longitude } = await resolveCoordinates(storeData);

  return {
    storeName:          storeData.storeName        || storeData.name         || storeData.store_name,
    storeAddressLine:   storeData.storeAddressLine || storeData.address      || storeData.addressLine,
    storeLocality:      storeData.storeLocality    || storeData.locality     || storeData.area,
    storePincode:       storeData.storePincode     || storeData.pincode      || storeData.pinCode,
    storeCity:          storeData.storeCity        || storeData.city,
    storeState:         storeData.storeState       || storeData.state,
    storeGmapUrl:       storeData.storeGmapUrl     || storeData.gmapUrl      || storeData.googleMapUrl,
    latitude,
    longitude,
    storeRatings:       storeData.storeRatings     || storeData.ratings      || storeData.rating || 0,
    storeKm:            storeData.storeKm          || storeData.km           || storeData.distance || storeData.store_distance || "",
    storeCategory:      storeData.storeCategory    || storeData.category,
    storeContact:       storeData.storeContact     || storeData.contact      || storeData.phone,
    storeEmail:         storeData.storeEmail       || storeData.email,
    storeImage:         storeData.storeImage       || storeData.image        || storeData.store_image || storeData.imageUrl,
    storeImages:        storeData.storeImages      || [],
    storeAttachedFiles: storeData.storeAttachedFiles || [],
    storeProof:         storeData.storeProof       || "", // Added missing storeProof field
    storeOwnerIdProof:  storeData.storeOwnerIdProof  || [],
    storeOwner,
  };
};

// ---------------------------------------------------------------------------
// Shared create handler — used by both POST /create and POST /
// ---------------------------------------------------------------------------
const handleCreateStore = asyncHandler(async (req, res) => {
  console.log("Store creation request body:", JSON.stringify(req.body));

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "No data provided. Please fill the form and submit." });
  }

  try {
    // Validate file URLs before creating store
    const fileValidationErrors = validateFileUrls(req.body);
    if (fileValidationErrors.length > 0) {
      return res.status(400).json({
        message: "File validation failed",
        errors: fileValidationErrors
      });
    }

    const finalStoreData = await buildStoreData(req.body);
    console.log("Final store data to save:", JSON.stringify(finalStoreData));

    const store = new Store(finalStoreData);
    const savedStore = await store.save();

    console.log("Store created successfully:", savedStore._id);
    return res.status(201).json({ message: "Store created successfully", store: savedStore });
  } catch (error) {
    console.error("Store creation error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      errors: error.errors
    });
    throw error; // Re-throw to be caught by asyncHandler
  }
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /stores/create
router.post("/create", handleCreateStore);

// POST /stores  (REST fallback)
router.post("/", handleCreateStore);

// GET /stores  — supports ?lat=&lng=&radius= for geo filtering
router.get("/", asyncHandler(async (req, res) => {
  const { lat, lng, radius } = req.query;
  
  // If location parameters are provided, filter by distance
  if (lat && lng && radius) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return res.status(400).json({ message: "Invalid location parameters" });
    }
    
    // Convert radius from km to meters for MongoDB geospatial query
    const radiusInMeters = radiusKm * 1000;
    
    console.log(`Searching stores within ${radiusKm}km of (${latitude}, ${longitude})`);
    
    // Find stores within the specified radius using geospatial query with $near for sorting
    const stores = await Store.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      },
      isDeleted: { $ne: true }
    });
    
    console.log(`Found ${stores.length} stores within ${radiusKm}km`);
    
    // Calculate and attach distance to each store
    const storesWithDistance = stores.map(store => {
      const storeDoc = store.toObject();
      
      // Calculate distance using Haversine formula
      if (store.latitude != null && store.longitude != null) {
        const distance = calculateDistance(latitude, longitude, store.latitude, store.longitude);
        storeDoc.distance = Math.round(distance * 100) / 100; // Round to 2 decimal places
      }
      
      return storeDoc;
    });
    
    // Sort by distance (nearest first)
    storesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    
    return res.json({ data: storesWithDistance });
  }
  
  // If no location parameters, fetch all non-deleted stores
  const stores = await Store.find({ isDeleted: { $ne: true } });
  console.log(`Found ${stores.length} total stores`);
  return res.json({ data: stores });
}));

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// GET /stores/owner/:ownerId  — MUST be before /:id
router.get("/owner/:ownerId", asyncHandler(async (req, res) => {
  const { ownerId } = req.params;
  console.log("Getting stores for owner:", ownerId);

  let stores = await Store.find({
    storeOwner: ownerId,
    isDeleted: { $ne: true },
  });

  // Fallback for legacy data where storeOwner was stored as a plain string
  if (stores.length === 0) {
    const allStores = await Store.find({ isDeleted: { $ne: true } });
    stores = allStores.filter((s) => s.storeOwner?.toString() === ownerId);
  }

  console.log("Found stores for owner:", stores.length);
  return res.json(stores);
}));

// GET /stores/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const store = await Store.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true },
  });
  if (!store) return res.status(404).json({ message: "Store not found" });
  return res.json(store);
}));

// PUT /stores/:id
router.put("/:id", asyncHandler(async (req, res) => {
  // Validate file URLs before updating store
  const fileValidationErrors = validateFileUrls(req.body);
  if (fileValidationErrors.length > 0) {
    return res.status(400).json({
      message: "File validation failed",
      errors: fileValidationErrors
    });
  }

  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ message: "Store not found" });

  Object.assign(store, req.body);
  await store.save({ validateBeforeSave: true }); // Ensure model validators run

  return res.json(store);
}));

// DELETE /stores/:id  (soft delete)
router.delete("/:id", asyncHandler(async (req, res) => {
  await Store.findByIdAndUpdate(req.params.id, { isDeleted: true });
  return res.json({ message: "Store deleted" });
}));

module.exports = router;