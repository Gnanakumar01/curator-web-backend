const express = require("express");
const router = express.Router();
const Category = require("../models/Category");


/*
CREATE CATEGORY
*/
router.post("/create", async (req, res) => {

  try {

    const category = new Category(req.body);

    await category.save();

    res.json(category);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
GET ALL CATEGORIES
*/
router.get("/", async (req, res) => {

  try {

    const categories = await Category.find({ isDeleted:false });

    res.json(categories);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
UPDATE CATEGORY
*/
router.put("/:id", async (req, res) => {

  try {

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new:true }
    );

    res.json(category);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
DELETE CATEGORY
*/
router.delete("/:id", async (req, res) => {

  try {

    await Category.findByIdAndUpdate(
      req.params.id,
      { isDeleted:true }
    );

    res.json({ message:"Category deleted" });

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;