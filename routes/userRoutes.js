const express = require("express");
const router = express.Router();
const User = require("../models/User");

/*
CREATE USER
*/
router.post("/create", async (req, res) => {

  try {

    const user = new User(req.body);

    await user.save();

    res.json(user);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
GET ALL USERS
*/
router.get("/", async (req, res) => {

  try {

    const users = await User.find({ isDeleted:false });

    res.json(users);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
GET USER BY ID
*/
router.get("/:id", async (req, res) => {

  try {

    const user = await User.findById(req.params.id);

    res.json(user);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
UPDATE USER
*/
router.put("/:id", async (req, res) => {

  try {

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new:true }
    );

    res.json(user);

  } catch (error) {

    res.status(500).json(error);

  }

});


/*
DELETE USER
*/
router.delete("/:id", async (req, res) => {

  try {

    await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted:true }
    );

    res.json({ message:"User deleted" });

  } catch (error) {

    res.status(500).json(error);

  }

});

module.exports = router;