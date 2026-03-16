const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");

/*
CREATE REQUIREMENT
*/
router.post("/create", async (req, res) => {
  try {
    console.log("Received requirement data:", req.body);
    
    // Handle empty string for reqOwner - convert to null or undefined
    const requirementData = { ...req.body };
    if (requirementData.reqOwner === "" || requirementData.reqOwner === null) {
      delete requirementData.reqOwner; // Let it use the default value (null)
    }
    
    const requirement = new Requirement(requirementData);

    const savedRequirement = await requirement.save();

    res.status(201).json(savedRequirement);

  } catch (error) {
    console.error("Error creating requirement:", error);
    res.status(500).json({ message: error.message });
  }
});


/*
GET ALL REQUIREMENTS
*/
router.get("/", async (req, res) => {
  try {

    const requirements = await Requirement.find({ isDeleted: false });

    res.json(requirements);

  } catch (error) {
    res.status(500).json(error);
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
      return res.status(404).json({ message: "Requirement not found" });
    }

    res.json(requirement);

  } catch (error) {
    res.status(500).json(error);
  }
});


/*
UPDATE REQUIREMENT
*/
router.put("/:id", async (req, res) => {
  try {
    // Handle empty string for reqOwner - convert to null or undefined
    const updateData = { ...req.body };
    if (updateData.reqOwner === "" || updateData.reqOwner === null) {
      delete updateData.reqOwner; // Keep existing value or use default
    }

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!requirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    res.json(requirement);

  } catch (error) {
    res.status(500).json(error);
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
      return res.status(404).json({ message: "Requirement not found" });
    }

    res.json({ message: "Requirement deleted successfully" });

  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;