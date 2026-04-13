const express = require("express");
const router = express.Router();
const User = require("../models/User");

/*
CREATE USER
*/
router.post("/create", async (req, res) => {

  try {

    const { userId, phone, ...userData } = req.body;
    
    if (phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Invalid mobile number format. Must be 10 digits starting with 6-9" });
      }
    }
    
    let user;
    
    if (userId) {
      user = await User.findByIdAndUpdate(
        userId,
        { ...userData, isProfileComplete: true },
        { new: true }
      );
    } else {
      user = new User({ ...userData, isProfileComplete: true });
      await user.save();
    }

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