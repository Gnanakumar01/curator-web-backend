const express = require("express");
const router = express.Router();
const Store = require("../models/Store");


/*
CREATE STORE
*/
router.post("/create", async (req, res) => {

  try {

    // Log the incoming data for debugging
    console.log("Store creation request body:", JSON.stringify(req.body));

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Error: Request body is empty");
      return res.status(400).json({ message: "No data provided. Please fill the form and submit." });
    }

    // Extract fields with flexible naming
    const { _id, ...storeData } = req.body;
    
    const finalStoreData = {
      storeName: storeData.storeName || storeData.name || storeData.store_name,
      storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
      storeLocality: storeData.storeLocality || storeData.locality || storeData.area,
      storePincode: storeData.storePincode || storeData.pincode || storeData.pinCode,
      storeCity: storeData.storeCity || storeData.city,
      storeState: storeData.storeState || storeData.state,
      storeGmapUrl: storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl,
      storeRatings: storeData.storeRatings || storeData.ratings || storeData.rating || 0,
      storeKm: storeData.storeKm || storeData.km || storeData.distance || storeData.store_distance || "",
      storeCategory: storeData.storeCategory || storeData.category,
      storeContact: storeData.storeContact || storeData.contact || storeData.phone,
      storeEmail: storeData.storeEmail || storeData.email,
      storeImage: storeData.storeImage || storeData.image || storeData.store_image || storeData.imageUrl || storeData.imageUrl
    };

    console.log("Processed store data:", JSON.stringify(finalStoreData));

    // Make validation optional - accept store even without required fields
    // if (!finalStoreData.storeName) {
    //   console.log("Validation error: storeName is missing");
    //   return res.status(400).json({ message: "Please provide store name" });
    // }

    // if (!finalStoreData.storeCity) {
    //   console.log("Validation error: storeCity is missing");
    //   return res.status(400).json({ message: "Please provide city" });
    // }

    const store = new Store(finalStoreData);
    console.log("Store object created, attempting to save...");

    await store.save();

    console.log("Store created successfully:", store._id);
    res.status(201).json(store);

  } catch (error) {

    console.error("Store creation error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    
    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      return res.status(400).json({ message: "A store with this information already exists" });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }

    res.status(500).json({ message: "Failed to store please try again", error: error.message });

  }

});

// Also support POST to root /stores (for direct form submissions)
router.post("/", async (req, res) => {

  try {

    // Log the incoming data for debugging
    console.log("Store creation request body (root):", JSON.stringify(req.body));

    // Check if body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log("Error: Request body is empty (root)");
      return res.status(400).json({ message: "No data provided. Please fill the form and submit." });
    }

    // Extract fields with flexible naming
    const { _id, ...storeData } = req.body;
    
    const finalStoreData = {
      storeName: storeData.storeName || storeData.name || storeData.store_name,
      storeAddressLine: storeData.storeAddressLine || storeData.address || storeData.addressLine,
      storeLocality: storeData.storeLocality || storeData.locality || storeData.area,
      storePincode: storeData.storePincode || storeData.pincode || storeData.pinCode,
      storeCity: storeData.storeCity || storeData.city,
      storeState: storeData.storeState || storeData.state,
      storeGmapUrl: storeData.storeGmapUrl || storeData.gmapUrl || storeData.googleMapUrl,
      storeRatings: storeData.storeRatings || storeData.ratings || storeData.rating || 0,
      storeKm: storeData.storeKm || storeData.km || storeData.distance || storeData.store_distance || "",
      storeCategory: storeData.storeCategory || storeData.category,
      storeContact: storeData.storeContact || storeData.contact || storeData.phone,
      storeEmail: storeData.storeEmail || storeData.email,
      storeImage: storeData.storeImage || storeData.image || storeData.store_image || storeData.imageUrl || storeData.imageUrl
    };

    console.log("Processed store data (root):", JSON.stringify(finalStoreData));

    // Make validation optional - accept store even without required fields
    // if (!finalStoreData.storeName) {
    //   console.log("Validation error: storeName is missing");
    //   return res.status(400).json({ message: "Please provide store name" });
    // }

    // if (!finalStoreData.storeCity) {
    //   console.log("Validation error: storeCity is missing");
    //   return res.status(400).json({ message: "Please provide city" });
    // }

    const store = new Store(finalStoreData);
    console.log("Store object created, attempting to save...");

    await store.save();

    console.log("Store created successfully:", store._id);
    res.status(201).json(store);

  } catch (error) {

    console.error("Store creation error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    
    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      return res.status(400).json({ message: "A store with this information already exists" });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }

    res.status(500).json({ message: "Failed to store please try again", error: error.message });

  }

});


/*
GET ALL STORES
*/
router.get("/", async (req, res) => {

  try {

    const stores = await Store.find({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });

    console.log("Found stores count:", stores.length);
    res.json(stores);

  } catch (error) {

    console.error("Get stores error:", error);
    res.status(500).json(error);

  }

});


/*
GET STORE BY ID
*/
router.get("/:id", async (req, res) => {

  try {

    const store = await Store.findById(req.params.id);

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
      { new:true }
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
      { isDeleted:true }
    );

    res.json({ message:"Store deleted" });

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;