const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");

router.post("/google-login", async (req, res) => {

  try {

    const { token } = req.body;

    const decodedToken = await admin.auth().verifyIdToken(token);

    res.json({
      message: "Google login successful",
      user: decodedToken
    });

  } catch (error) {

    res.status(401).json({
      message: "Invalid token"
    });

  }

});

module.exports = router;