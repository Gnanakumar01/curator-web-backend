const Store = require("../models/Store");

// Validation helper for store file fields
const validateStoreFiles = (data) => {
  const errors = [];

  // Validate storeImage (single image, max 5MB)
  if (data.storeImage) {
    if (!data.storeImage.startsWith('http')) {
      errors.push('storeImage must be a valid URL');
    }
    // Could add more validation: check if URL is from Cloudinary, check file type from URL, etc.
  }

  // Validate storeAttachedFiles (array of images/videos)
  if (data.storeAttachedFiles && Array.isArray(data.storeAttachedFiles)) {
    if (data.storeAttachedFiles.length === 0) {
      errors.push('storeAttachedFiles must contain at least one file');
    }
    data.storeAttachedFiles.forEach((url, index) => {
      if (!url.startsWith('http')) {
        errors.push(`storeAttachedFiles[${index}] must be a valid URL`);
      }
    });
  }

  // Validate storeProof (PDF, max 5MB)
  if (data.storeProof) {
    if (!data.storeProof.startsWith('http')) {
      errors.push('storeProof must be a valid URL');
    }
  }

  // Validate storeOwnerIdProof (array of images)
  if (data.storeOwnerIdProof && Array.isArray(data.storeOwnerIdProof)) {
    if (data.storeOwnerIdProof.length === 0) {
      errors.push('storeOwnerIdProof must contain at least one file');
    }
    data.storeOwnerIdProof.forEach((url, index) => {
      if (!url.startsWith('http')) {
        errors.push(`storeOwnerIdProof[${index}] must be a valid URL`);
      }
    });
  }

  // Validate storeCity - prevent page numbers
  if (data.storeCity && /^\d+$/.test(data.storeCity.trim())) {
    errors.push('Please enter a valid city name, not a page number');
  }

  // Validate storeLocality - prevent page numbers
  if (data.storeLocality && /^\d+$/.test(data.storeLocality.trim())) {
    errors.push('Please enter a valid locality name, not a page number');
  }

  return errors;
};

exports.createStore = async (req, res) => {
  try {
    // Validate file URLs before creating store
    const validationErrors = validateStoreFiles(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const store = await Store.create(req.body);
    res.json(store);
  } catch (err) {
    console.error("Error creating store:", err);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      message: 'Failed to create store',
      error: err.message
    });
  }
};

exports.getStores = async (req, res) => {
  try {
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
      
      // Find stores within the specified radius using geospatial query
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
    res.json({ data: stores });
    
  } catch (err) {
    console.error("Error fetching stores:", err);
    res.status(500).json({ message: "Failed to fetch stores", error: err.message });
  }
};

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

exports.getStore = async (req, res) => {
  const store = await Store.findById(req.params.id);
  res.json(store);
};

exports.updateStore = async (req, res) => {
  try {
    // Validate file URLs before updating store
    const validationErrors = validateStoreFiles(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // Run model validators
    );

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json(store);
  } catch (err) {
    console.error("Error updating store:", err);
    
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      message: 'Failed to update store',
      error: err.message
    });
  }
};

exports.deleteStore = async (req, res) => {
  await Store.findByIdAndDelete(req.params.id);
  res.json({ message: "Store deleted" });
};