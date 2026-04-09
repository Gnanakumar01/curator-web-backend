const express = require("express");
const router = express.Router();
const Response = require("../models/Response");
const Requirement = require("../models/Requirement");
const Store = require("../models/Store");

router.post("/create", async (req, res) => {
  try {
    const response = new Response(req.body);
    await response.save();
    
    const io = req.app.get("io");
    const requirement = await Requirement.findById(req.body.requirementId);
    
    if (requirement && requirement.createdBy) {
      const store = await Store.findById(req.body.storeId);
      const storeName = store?.storeName || "A store";
      
      const notification = {
        type: "quotation",
        title: "New Quotation Received",
        message: `${storeName} sent a quotation for "${requirement.reqTitle}"`,
        requirementId: req.body.requirementId,
        responseId: response._id,
        timestamp: new Date()
      };
      
      const socketId = req.app.locals.userSockets?.get(requirement.createdBy.toString());
      if (socketId) {
        io.to(socketId).emit("notification", notification);
      }
    }
    
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

router.get("/requirement/:requirementId", async (req, res) => {
  try {
    const data = await Response.find({ requirementId: req.params.requirementId })
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity storeOwner");
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await Response.findById(req.params.id)
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity");
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = await Response.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (req.body.status === "Accepted" && data) {
      const io = req.app.get("io");
      const requirement = await Requirement.findById(data.requirementId);
      const store = await Store.findById(data.storeId);
      
      if (store && store.storeOwner) {
        const notification = {
          type: "quotation_accepted",
          title: "Quotation Accepted",
          message: `Your quotation for "${requirement?.reqTitle || "a requirement"}" was accepted!`,
          requirementId: data.requirementId,
          responseId: data._id,
          timestamp: new Date()
        };
        
        const socketId = req.app.locals.userSockets?.get(store.storeOwner.toString());
        if (socketId) {
          io.to(socketId).emit("notification", notification);
        }
      }
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;