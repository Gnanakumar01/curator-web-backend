const Store = require("../models/Store");

exports.createStore = async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.json(store);
  } catch (err) {
    res.status(500).json(err);
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
  const store = await Store.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(store);
};

exports.deleteStore = async (req, res) => {
  await Store.findByIdAndDelete(req.params.id);
  res.json({ message: "Store deleted" });
};