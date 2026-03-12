const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");

/*
CREATE QUOTATION
*/
router.post("/create", async (req, res) => {
  try {
    console.log("Quotation request body:", req.body);
    
    const quotation = new Quotation(req.body);

    const savedQuotation = await quotation.save();

    res.status(201).json(savedQuotation);

  } catch (error) {
    console.error("Quotation save error:", error);
    res.status(500).json({ message: error.message, errors: error.errors });
  }
});

// Also support POST to root /quotations (for direct form submissions)
router.post("/", async (req, res) => {
  try {
    console.log("Quotation request body:", req.body);
    
    const quotation = new Quotation(req.body);

    const savedQuotation = await quotation.save();

    res.status(201).json(savedQuotation);

  } catch (error) {
    console.error("Quotation save error:", error);
    res.status(500).json({ message: error.message, errors: error.errors });
  }
});


/*
GET ALL QUOTATIONS
*/
router.get("/", async (req, res) => {
  try {

    const quotations = await Quotation.find({ $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] })
      .populate("user", "name email")
      .populate("requirement", "title description");

    console.log("Found quotations count:", quotations.length);
    res.json(quotations);

  } catch (error) {
    console.error("Get quotations error:", error);
    res.status(500).json(error);
  }
});


/*
GET QUOTATION BY ID
*/
router.get("/:id", async (req, res) => {
  try {

    const quotation = await Quotation.findOne({
      _id: req.params.id,
      isDeleted: false
    })
      .populate("user", "name email")
      .populate("requirement", "title description");

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json(quotation);

  } catch (error) {
    res.status(500).json(error);
  }
});


/*
GET QUOTATIONS BY USER
*/
router.get("/user/:userId", async (req, res) => {
  try {

    const quotations = await Quotation.find({
      user: req.params.userId,
      isDeleted: false
    })
      .populate("requirement", "title description");

    res.json(quotations);

  } catch (error) {
    res.status(500).json(error);
  }
});


/*
GET QUOTATIONS BY REQUIREMENT
*/
router.get("/requirement/:requirementId", async (req, res) => {
  try {

    const quotations = await Quotation.find({
      requirement: req.params.requirementId,
      isDeleted: false
    })
      .populate("user", "name email");

    res.json(quotations);

  } catch (error) {
    res.status(500).json(error);
  }
});


/*
UPDATE QUOTATION
*/
router.put("/:id", async (req, res) => {
  try {

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json(quotation);

  } catch (error) {
    res.status(500).json(error);
  }
});


/*
DELETE QUOTATION (Soft Delete)
*/
router.delete("/:id", async (req, res) => {
  try {

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.json({ message: "Quotation deleted successfully" });

  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
