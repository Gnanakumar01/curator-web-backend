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
    const data = await Response.find({ isDeleted: { $ne: true } });
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/requirement/:requirementId", async (req, res) => {
  try {
    const data = await Response.find({ requirementId: req.params.requirementId, isDeleted: { $ne: true } })
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity storeOwner");
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await Response.findById(req.params.id)
      .populate("storeId", "storeName storeImage storeRatings storeAddressLine storeLocality storeCity")
      .populate("requirementId", "reqTitle expectedBudget targetLocation deadLineDate");
    // If the response is soft deleted, return 404
    if (data && data.isDeleted) {
      return res.status(404).json({ message: "Response not found" });
    }
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
      const requirement = await Requirement.findById(data.requirementId).populate("createdBy", "firstName lastName");
      const store = await Store.findById(data.storeId);
      
      if (store && store.storeOwner) {
        // Get customer name from requirement
        let customerName = "A customer";
        if (requirement?.createdBy) {
          const user = requirement.createdBy;
          if (user.firstName && user.lastName) {
            customerName = `${user.firstName} ${user.lastName}`;
          } else if (user.firstName) {
            customerName = user.firstName;
          }
        }
        
        const notificationMessage = `${customerName} accepted your quotation for "${requirement?.reqTitle || "a requirement"}"`;
        
        // Create notification record in database
        const notificationRecord = new Response({
          requirementId: data.requirementId,
          storeId: null,
          price: 0,
          deliveryTime: 0,
          deliveryTimeUnit: "days",
          message: notificationMessage,
          status: "Notification",
          notificationForStoreOwner: true,
          notificationTitle: "Quotation Accepted",
          notificationMessage: notificationMessage,
          notificationType: "quotation_accepted",
          isNotificationRead: false,
          notificationRecipientId: store.storeOwner,
          notificationSenderId: requirement?.createdBy?._id
        });
        await notificationRecord.save();
        
        // Send WebSocket notification
        const notification = {
          type: "quotation_accepted",
          title: "Quotation Accepted",
          message: notificationMessage,
          requirementId: data.requirementId,
          responseId: data._id,
          notificationId: notificationRecord._id,
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

// DELETE /api/responses/:id - Soft delete a response/quotation
router.delete("/:id", async (req, res) => {
  try {
    const data = await Response.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!data) {
      return res.status(404).json({ message: "Response not found" });
    }
    
    // Send notification to customer when quotation is deleted by store owner
    const io = req.app.get("io");
    if (data.requirementId && data.requirementId.createdBy) {
      const requirement = await Requirement.findById(data.requirementId);
      const store = await Store.findById(data.storeId);
      
      if (requirement && requirement.createdBy && store) {
        let customerName = "A customer";
        if (requirement.createdBy.firstName && requirement.createdBy.lastName) {
          customerName = `${requirement.createdBy.firstName} ${requirement.createdBy.lastName}`;
        } else if (requirement.createdBy.firstName) {
          customerName = requirement.createdBy.firstName;
        }
        
        const storeName = store.storeName || "A store";
        
        const notificationMessage = `${storeName} deleted their quotation for "${requirement.reqTitle}"`;
        
        // Create notification record in database
        const notificationRecord = new Response({
          requirementId: data.requirementId,
          storeId: null,
          price: 0,
          deliveryTime: 0,
          deliveryTimeUnit: "days",
          message: notificationMessage,
          status: "Notification",
          notificationForStoreOwner: false, // This is for customer
          notificationTitle: "Quotation Deleted",
          notificationMessage: notificationMessage,
          notificationType: "quotation_deleted",
          isNotificationRead: false,
          notificationRecipientId: requirement.createdBy._id,
          notificationSenderId: store.storeOwner
        });
        await notificationRecord.save();
        
        // Send WebSocket notification
        const notification = {
          type: "quotation_deleted",
          title: "Quotation Deleted",
          message: notificationMessage,
          requirementId: data.requirementId,
          responseId: notificationRecord._id,
          timestamp: new Date()
        };
        
        const socketId = req.app.locals.userSockets?.get(requirement.createdBy._id.toString());
        if (socketId) {
          io.to(socketId).emit("notification", notification);
        }
      }
    }
    
    res.json({ message: "Response deleted successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;