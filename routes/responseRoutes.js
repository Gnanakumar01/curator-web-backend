const express = require("express");
const router = express.Router();
const Response = require("../models/Response");

router.post("/create", async (req, res) => {
  try {
    const response = new Response(req.body);
    await response.save();
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await Response.find();
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/requirement/:requirementId", async (req, res) => {
  try {
    const data = await Response.find({ requirementId: req.params.requirementId })
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity storeOwner");
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await Response.findById(req.params.id)
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity");
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await Response.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;