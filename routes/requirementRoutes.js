const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");

/*
CREATE REQUIREMENT
*/
router.post("/create", async (req, res) => {
  try {

    const requirement = new Requirement(req.body);

    const savedRequirement = await requirement.save();

    res.status(201).json({
      success: true,
      data: savedRequirement
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating requirement",
      error: error.message
    });
  }
});


/*
GET ALL REQUIREMENTS
*/
router.get("/", async (req, res) => {
  try {

    const requirements = await Requirement.find({ isDeleted: false });

    res.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching requirements",
      error: error.message
    });
  }
});


/*
GET REQUIREMENT BY ID
*/
router.get("/:id", async (req, res) => {
  try {

    const requirement = await Requirement.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    res.json({
      success: true,
      data: requirement
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching requirement",
      error: error.message
    });
  }
});


/*
UPDATE REQUIREMENT
*/
router.put("/:id", async (req, res) => {
  try {

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    res.json({
      success: true,
      data: requirement
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating requirement",
      error: error.message
    });
  }
});


/*
DELETE REQUIREMENT (Soft Delete)
*/
router.delete("/:id", async (req, res) => {
  try {

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found"
      });
    }

    res.json({
      success: true,
      message: "Requirement deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting requirement",
      error: error.message
    });
  }
});

module.exports = router;