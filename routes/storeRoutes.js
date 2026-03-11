const express = require("express");
const router = express.Router();
const Store = require("../models/Store");


/*
CREATE STORE
*/
router.post("/create", async (req, res) => {

  try {

    const store = new Store(req.body);

    await store.save();

    res.json(store);

  } catch (error) {

    res.status(500).json(error);

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