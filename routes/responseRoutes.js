const express = require("express");
const router = express.Router();
const Response = require("../models/Response");

router.post("/create", async (req, res) => {
  try {
    const response = new Response(req.body);
    await response.save();
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await Response.find();
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;