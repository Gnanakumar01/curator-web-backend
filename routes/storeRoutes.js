const express = require("express");
const router = express.Router();
const Store = require("../models/Store");


/*
CREATE STORE
*/
router.post("/create", async (req, res) => {

  try {

    // Validate required fields
    const { storeName, storeAddressLine, storeLocality, storePincode, storeCity, storeState } = req.body;
    
    if (!storeName || !storeAddressLine || !storePincode || !storeCity) {
      return res.status(400).json({ message: "Please provide store name, address, pincode, and city" });
    }

    const store = new Store(req.body);

    await store.save();

    res.status(201).json(store);

  } catch (error) {

    console.error("Store creation error:", error);
    res.status(500).json({ message: "Failed to store please try again", error: error.message });

  }

});


/*
GET ALL STORES
*/
router.get("/", async (req, res) => {

  try {

    const stores = await Store.find({ isDeleted:false });

    res.json(stores);

  } catch (error) {

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