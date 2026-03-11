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

    res.status(201).json(savedRequirement);

  } catch (error) {
    res.status(500).json(error);
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

    const requirement = await Requirement.findByIdAndUpdate(
      req.params.id,
      req.body,
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