const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");
const User = require("../models/User");
const Store = require("../models/Store");
const jwt = require("jsonwebtoken");

router.post("/google-login", async (req, res) => {
  console.log("🔍 Request body:", req.body);
  console.log("🔍 JWT_SECRET:", process.env.JWT_SECRET);
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken missing"
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName: name || "User",
        email,
        userType: "customer"
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const store = await Store.findOne({ storeOwner: user._id, isDeleted: false });

    res.json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        locality: user.locality,
        userType: user.userType,
        isProfileComplete: user.isProfileComplete,
        hasStore: !!store
      }
    });

  } catch (error) {
    console.error("Google Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;