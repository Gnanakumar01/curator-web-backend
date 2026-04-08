const express = require("express");
const router = express.Router();
const Response = require("../models/Response");

// Create notification (using Response collection)
router.post("/create", async (req, res) => {
  try {
    const {
      recipientId,
      senderId,
      title,
      message,
      type,
      relatedId,
      relatedModel
    } = req.body;

    // Determine if this is for a store owner or customer
    // If type is "quotation_accepted", it's for store owner
    // If type is "quotation", it's for customer
    const isForStoreOwner = type === "quotation_accepted";

    // Create a new Response document with notification fields
    const notification = new Response({
      requirementId: relatedModel === "Requirement" ? relatedId : null,
      storeId: null,
      price: 0,
      deliveryTime: 0,
      deliveryTimeUnit: "days",
      message: message,
      status: "Notification",
      notificationForStoreOwner: isForStoreOwner,
      notificationTitle: title,
      notificationMessage: message,
      notificationType: type,
      isNotificationRead: false,
      notificationRecipientId: recipientId,
      notificationSenderId: senderId
    });

    await notification.save();
    
    // Send real-time notification via WebSocket
    const io = req.app.get("io");
    const userSockets = req.app.locals.userSockets;
    const socketId = userSockets?.get(recipientId.toString());
    if (socketId) {
      io.to(socketId).emit("notification", {
        type: type,
        title: title,
        message: message,
        requirementId: relatedModel === "Requirement" ? relatedId : null,
        responseId: relatedModel === "Response" ? relatedId : null,
        notificationId: notification._id,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notifications for a user (both store owner and customer)
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find all Response documents that are notifications for this user
    // This includes both store owner notifications and customer notifications
    const notifications = await Response.find({
      notificationRecipientId: userId,
      $or: [
        { notificationForStoreOwner: true },
        { notificationType: "quotation" }
      ]
    })
    .populate("notificationSenderId", "firstName lastName")
    .sort({ createdAt: -1 });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get unread notification count for a user
router.get("/user/:userId/unread-count", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const count = await Response.countDocuments({
      notificationRecipientId: userId,
      $or: [
        { notificationForStoreOwner: true },
        { notificationType: "quotation" }
      ],
      isNotificationRead: false
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Response.findByIdAndUpdate(
      req.params.id,
      { isNotificationRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read for a user
router.put("/user/:userId/read-all", async (req, res) => {
  try {
    const userId = req.params.userId;
    
    await Response.updateMany(
      {
        notificationRecipientId: userId,
        $or: [
          { notificationForStoreOwner: true },
          { notificationType: "quotation" }
        ],
        isNotificationRead: false
      },
      { isNotificationRead: true }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    await Response.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
