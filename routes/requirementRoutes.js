const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");

/*
CREATE REQUIREMENT
*/
router.post("/create", async (req, res) => {
  try {
    console.log("Received requirement data:", req.body);
    
    const requirementData = { ...req.body };
    if (requirementData.reqOwner === "" || requirementData.reqOwner === null) {
      delete requirementData.reqOwner;
    }
    
    const requirement = new Requirement(requirementData);
    const savedRequirement = await requirement.save();

    res.status(201).json({
      success: true,
      data: savedRequirement
    });

  } catch (error) {
    console.error("Error creating requirement:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

/*
GET ALL REQUIREMENTS
*/
router.get("/", async (req, res) => {
  try {
    const requirements = await Requirement.find({ isDeleted: false })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    console.error("Get requirements error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
    console.error("Get requirement error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/*
UPDATE REQUIREMENT
*/
router.put("/:id", async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.reqOwner === "" || updateData.reqOwner === null) {
      delete updateData.reqOwner;
    }

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    console.error("Update requirement error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
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
    console.error("Delete requirement error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;