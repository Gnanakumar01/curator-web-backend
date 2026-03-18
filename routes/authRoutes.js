const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");

const User = require("../models/User"); // ✅ ADD
const jwt = require("jsonwebtoken");   // ✅ ADD

router.post("/google-login", async (req, res) => {

  try {
    const { token } = req.body;

    // ✅ VERIFY FIREBASE TOKEN
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { email, name } = decodedToken;

    // ✅ CHECK USER IN DB
    let user = await User.findOne({ email });

    // ✅ CREATE USER IF NOT EXISTS
    if (!user) {
      user = await User.create({
        firstName: name || "User",
        email,
        userType: "customer" // default
      });
    }

    // ✅ CREATE JWT TOKEN
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ FINAL RESPONSE (IMPORTANT FORMAT)
    res.json({
      success: true,
      token: jwtToken,
      user
    });

  } catch (error) {
    console.error("Google Login Error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }

});

module.exports = router;