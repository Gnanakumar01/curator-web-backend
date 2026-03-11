const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");


/*
CREATE REQUIREMENT
*/
router.post("/create", async (req, res) => {

  try {

    const requirement = new Requirement(req.body);

    await requirement.save();

    res.json(requirement);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
GET ALL REQUIREMENTS
*/
router.get("/", async (req, res) => {

  try {

    const data = await Requirement.find({ isDeleted:false });

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
GET REQUIREMENT BY ID
*/
router.get("/:id", async (req, res) => {

  try {

    const data = await Requirement.findById(req.params.id);

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
UPDATE REQUIREMENT
*/
router.put("/:id", async (req, res) => {

  try {

    const data = await Requirement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new:true }
    );

    res.json(data);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
DELETE REQUIREMENT
*/
router.delete("/:id", async (req, res) => {

  try {

    await Requirement.findByIdAndUpdate(
      req.params.id,
      { isDeleted:true }
    );

    res.json({ message:"Requirement deleted" });

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;