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

    // Helper to get user ID string from various formats
    const getUserIdString = (userField) => {
      if (!userField) return null;
      if (typeof userField === 'string') return userField;
      if (userField._id) return userField._id.toString();
      if (userField.toString) return userField.toString();
      return null;
    };

    // 1. Send notification to customer (requirement creator)
    if (requirement && requirement.createdBy) {
      const store = await Store.findById(req.body.storeId);
      const storeName = store?.storeName || "A store";

      const notificationMessage = `${storeName} sent a quotation for "${requirement.reqTitle}"`;

      // Get customer user ID
      const customerUserId = getUserIdString(requirement.createdBy);

      // Persist notification to database
      const notificationRecord = new Response({
        requirementId: req.body.requirementId,
        storeId: null,
        price: 0,
        deliveryTime: 0,
        deliveryTimeUnit: "days",
        message: notificationMessage,
        status: "Notification",
        notificationForStoreOwner: false,
        notificationTitle: "New Quotation Received",
        notificationMessage: notificationMessage,
        notificationType: "quotation",
        isNotificationRead: false,
        notificationRecipientId: customerUserId,
        notificationSenderId: req.body.storeId
      });
      await notificationRecord.save();

      const notification = {
        type: "quotation",
        title: "New Quotation Received",
        message: notificationMessage,
        requirementId: req.body.requirementId,
        responseId: response._id,
        notificationId: notificationRecord._id,
        timestamp: new Date()
      };

      // Send to customer via WebSocket
      if (customerUserId) {
        const customerSocketId = req.app.locals.userSockets?.get(customerUserId);
        if (customerSocketId) {
          io.to(customerSocketId).emit("notification", notification);
          console.log("Quotation notification sent to customer:", customerUserId);
        } else {
          console.log("Customer not connected via WebSocket:", customerUserId);
        }
      }
    }

    // 2. Send confirmation notification to store owner who submitted the quotation
    if (req.body.storeId) {
      const store = await Store.findById(req.body.storeId).populate("storeOwner");
      if (store && store.storeOwner) {
        // Get store owner user ID
        const storeOwnerUserId = getUserIdString(store.storeOwner);
        if (storeOwnerUserId) {
          const storeOwnerSocketId = req.app.locals.userSockets?.get(storeOwnerUserId);
          if (storeOwnerSocketId) {
            const notification = {
              type: "quotation_submitted",
              title: "Quotation Submitted Successfully",
              message: `Your quotation for "${requirement?.reqTitle || 'the requirement'}" has been submitted.`,
              requirementId: req.body.requirementId,
              responseId: response._id,
              timestamp: new Date()
            };
            io.to(storeOwnerSocketId).emit("notification", notification);
            console.log("Quotation confirmation sent to store owner:", storeOwnerUserId);
          } else {
            console.log("Store owner not connected via WebSocket:", storeOwnerUserId);
          }
        }
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

// Helper to get user ID string from various formats
const getUserIdString = (userField) => {
  if (!userField) return null;
  if (typeof userField === 'string') return userField;
  if (userField._id) return userField._id.toString();
  if (userField.toString) return userField.toString();
  return null;
};

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
      const store = await Store.findById(data.storeId).populate("storeOwner");
      
      if (store && store.storeOwner) {
        // Get store owner user ID
        const storeOwnerUserId = getUserIdString(store.storeOwner);
        
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
          notificationRecipientId: storeOwnerUserId,
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
        
        if (storeOwnerUserId) {
          const socketId = req.app.locals.userSockets?.get(storeOwnerUserId);
          if (socketId) {
            io.to(socketId).emit("notification", notification);
            console.log("Quotation accepted notification sent to store owner:", storeOwnerUserId);
          } else {
            console.log("Store owner not connected via WebSocket:", storeOwnerUserId);
          }
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
    if (data.requirementId) {
      const requirement = await Requirement.findById(data.requirementId).populate("createdBy", "firstName lastName");
      const store = await Store.findById(data.storeId).populate("storeOwner");
      
      if (requirement && requirement.createdBy && store) {
        const storeName = store.storeName || "A store";
        
        // Get customer user ID
        const customerUserId = getUserIdString(requirement.createdBy);
        
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
          notificationRecipientId: customerUserId,
          notificationSenderId: store.storeOwner?._id
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
        
        if (customerUserId) {
          const socketId = req.app.locals.userSockets?.get(customerUserId);
          if (socketId) {
            io.to(socketId).emit("notification", notification);
            console.log("Quotation deleted notification sent to customer:", customerUserId);
          } else {
            console.log("Customer not connected via WebSocket:", customerUserId);
          }
        }
      }
    }
    
    res.json({ message: "Response deleted successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;