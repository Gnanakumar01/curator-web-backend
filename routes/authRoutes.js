const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

router.post("/google-login", async (req, res) => {
  console.log("🔍 Request body:", req.body);        // ← add this
  console.log("🔍 JWT_SECRET:", process.env.JWT_SECRET);
  try {
    // ✅ FIXED: Read 'idToken' (frontend sends idToken, not token)
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "idToken missing"
      });
    }

    // ✅ Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;

    // ✅ Find or create user in MongoDB
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName: name || "User",
        email,
        userType: "customer" // default
      });
    }

    // ✅ Sign JWT with secret from .env
    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: jwtToken,
      user
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
