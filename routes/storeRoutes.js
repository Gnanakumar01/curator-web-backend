const express = require("express");
const router = express.Router();
const Store = require("../models/Store");
const { geocodeAddress, buildFullAddress } = require("../utils/geocoding");

// Helper function to extract coordinates from Google Maps URL
const extractCoordinates = (gmapUrl) => {
  if (!gmapUrl) return { latitude: null, longitude: null };
  
  // Try to extract from @latitude,longitude format
  const latLngMatch = gmapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (latLngMatch) {
    return {
      latitude: parseFloat(latLngMatch[1]),
      longitude: parseFloat(latLngMatch[2])
    };
  }
  
  // Try to extract from ?query=latitude,longitude format
  const queryMatch = gmapUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (queryMatch) {
    return {
      latitude: parseFloat(queryMatch[1]),
      longitude: parseFloat(queryMatch[2])
    };
  }
  
  // Try to extract from /maps/search format
  const searchMatch = gmapUrl.match(/maps\/search\/([^/]+)/);
  if (searchMatch) {
    // This is a search URL, can't extract coordinates reliably
    return { latitude: null, longitude: null };
  }
  
  return { latitude: null, longitude: null };
};


/*
CREATE STORE
*/
router.post("/create", async (req, res) => {

  try {

    console.log("Store creation request body:", JSON.stringify(req.body));

    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Error: Request body is empty");
      return res.status(400).json({ message: "No data provided. Please fill the form and submit." });
    }

    const { _id, ...storeData } = req.body;

    // Extract coordinates: first check if provided directly, otherwise try to extract from URL, then use Nominatim as fallback
    let latitude = null;
    let longitude = null;
    
    if (storeData.latitude && storeData.longitude) {
      latitude = parseFloat(storeData.latitude);
      longitude = parseFloat(storeData.longitude);
    } else {
      const extracted = extractCoordinates(storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl);
      latitude = extracted.latitude;
      longitude = extracted.longitude;
    }
    
    // If still no coordinates, try Nominatim geocoding as fallback
    if (!latitude || !longitude) {
      const tempStoreData = {
        storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
        storeLocality: storeData.storeLocality || storeData.locality || storeData.area,
        storeCity: storeData.storeCity || storeData.city,
        storeState: storeData.storeState || storeData.state,
        storePincode: storeData.storePincode || storeData.pincode || storeData.pinCode
      };
      const fullAddress = buildFullAddress(tempStoreData);
      if (fullAddress) {
        console.log("Attempting Nominatim geocoding for address:", fullAddress);
        const geocoded = await geocodeAddress(fullAddress);
        if (geocoded.latitude && geocoded.longitude) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          console.log("Nominatim geocoding successful:", latitude, longitude);
        }
      }
    }

    const finalStoreData = {
      storeName:        storeData.storeName || storeData.name || storeData.store_name,
      storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
      storeLocality:    storeData.storeLocality || storeData.locality || storeData.area,
      storePincode:     storeData.storePincode || storeData.pincode || storeData.pinCode,
      storeCity:        storeData.storeCity || storeData.city,
      storeState:       storeData.storeState || storeData.state,
      storeGmapUrl:     storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl,
      latitude:         latitude,
      longitude:        longitude,
      storeRatings:     storeData.storeRatings || storeData.ratings || storeData.rating || 0,
      storeKm:          storeData.storeKm || storeData.km || storeData.distance || storeData.store_distance || "",
      storeCategory:    storeData.storeCategory || storeData.category,
      storeContact:     storeData.storeContact || storeData.contact || storeData.phone,
      storeEmail:       storeData.storeEmail || storeData.email,
      storeImage:       storeData.storeImage || storeData.image || storeData.store_image || storeData.imageUrl,
      storeImages:      storeData.storeImages || [],
      storeAttachedFiles: storeData.storeAttachedFiles || [],
      storeOwner:       storeData.storeOwner || storeData.ownerId || null
    };

    console.log("Final store data to save:", finalStoreData);

    const store = new Store(finalStoreData);
    const savedStore = await store.save();

    console.log("Store created successfully:", savedStore._id);
    res.status(201).json({ message: "Store created successfully", store: savedStore });

  } catch (error) {

    console.error("Store creation error details:", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "A store with this information already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }

    res.status(500).json({ message: "Failed to create store, please try again", error: error.message });

  }

});


// Also support POST to root /stores
router.post("/", async (req, res) => {

  try {

    console.log("Store creation request body (root):", JSON.stringify(req.body));

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "No data provided. Please fill the form and submit." });
    }

    const { _id, ...storeData } = req.body;

    // Extract coordinates: first check if provided directly, otherwise try to extract from URL, then use Nominatim as fallback
    let latitude = null;
    let longitude = null;
    
    if (storeData.latitude && storeData.longitude) {
      latitude = parseFloat(storeData.latitude);
      longitude = parseFloat(storeData.longitude);
    } else {
      const extracted = extractCoordinates(storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl);
      latitude = extracted.latitude;
      longitude = extracted.longitude;
    }
    
    // If still no coordinates, try Nominatim geocoding as fallback
    if (!latitude || !longitude) {
      const tempStoreData = {
        storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
        storeLocality: storeData.storeLocality || storeData.locality || storeData.area,
        storeCity: storeData.storeCity || storeData.city,
        storeState: storeData.storeState || storeData.state,
        storePincode: storeData.storePincode || storeData.pincode || storeData.pinCode
      };
      const fullAddress = buildFullAddress(tempStoreData);
      if (fullAddress) {
        console.log("Attempting Nominatim geocoding for address:", fullAddress);
        const geocoded = await geocodeAddress(fullAddress);
        if (geocoded.latitude && geocoded.longitude) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
          console.log("Nominatim geocoding successful:", latitude, longitude);
        }
      }
    }

    const finalStoreData = {
      storeName:        storeData.storeName || storeData.name || storeData.store_name,
      storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
      storeLocality:    storeData.storeLocality || storeData.locality || storeData.area,
      storePincode:     storeData.storePincode || storeData.pincode || storeData.pinCode,
      storeCity:        storeData.storeCity || storeData.city,
      storeState:       storeData.storeState || storeData.state,
      storeGmapUrl:     storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl,
      latitude:         latitude,
      longitude:        longitude,
      storeRatings:     storeData.storeRatings || storeData.ratings || storeData.rating || 0,
      storeKm:          storeData.storeKm || storeData.km || storeData.distance || storeData.store_distance || "",
      storeCategory:    storeData.storeCategory || storeData.category,
      storeContact:     storeData.storeContact || storeData.contact || storeData.phone,
      storeEmail:       storeData.storeEmail || storeData.email,
      storeImage:       storeData.storeImage || storeData.image || storeData.store_image || storeData.imageUrl,
      storeImages:      storeData.storeImages || [],
      storeAttachedFiles: storeData.storeAttachedFiles || [],
      storeOwner:       storeData.storeOwner || storeData.ownerId || null
    };

    console.log("Final store data to save (root):", finalStoreData);

    const store = new Store(finalStoreData);
    const savedStore = await store.save();

    console.log("Store created successfully (root):", savedStore._id);
    res.status(201).json({ message: "Store created successfully", store: savedStore });

  } catch (error) {

    console.error("Store creation error details (root):", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "A store with this information already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }

    res.status(500).json({ message: "Failed to create store, please try again", error: error.message });

  }

});


/*
GET ALL STORES
*/
router.get("/", async (req, res) => {

  try {

    const stores = await Store.find({
      isDeleted: { $ne: true }
    });

    console.log("Found stores count:", stores.length);
    res.json(stores);

  } catch (error) {

    console.error("Get stores error:", error);
    res.status(500).json(error);

  }

});


/*
GET STORES BY OWNER
⚠️  MUST be defined BEFORE "/:id"
    Express matches routes top-to-bottom. If /:id comes first,
    a request to /owner/abc123 is treated as /:id = "owner"
    and this route is NEVER reached.
*/
router.get("/owner/:ownerId", async (req, res) => {

  try {

    const { ownerId } = req.params;
    console.log("Getting stores for owner ID:", ownerId);

    // Direct query — works when storeOwner is stored as ObjectId
    let stores = await Store.find({
      storeOwner: ownerId,
      isDeleted: { $ne: true }
    });

    console.log("Found stores with direct match:", stores.length);

    // Fallback: handles edge case where storeOwner was saved as a plain
    // string instead of ObjectId (common in older/seeded data)
    if (stores.length === 0) {
      const allStores = await Store.find({
        isDeleted: { $ne: true }
      });

      console.log("Total stores in DB:", allStores.length);

      stores = allStores.filter(s => s.storeOwner?.toString() === ownerId);

      console.log("Found stores after fallback filter:", stores.length);
    }

    res.json(stores);

  } catch (error) {

    console.error("Get stores by owner error:", error);
    res.status(500).json({ message: error.message });

  }

});


/*
GET STORE BY ID
⚠️  MUST be defined AFTER all specific named GET routes
    because /:id is a wildcard — it matches ANY single path segment
*/
router.get("/:id", async (req, res) => {

  try {

    const store = await Store.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true }
    });
    res.json(store);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
UPDATE STORE
*/
router.put("/:id", async (req, res) => {

  try {

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(store);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
DELETE STORE
*/
router.delete("/:id", async (req, res) => {

  try {

    await Store.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true }
    );

    res.json({ message: "Store deleted" });

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;
