const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

/*
CREATE NOTIFICATION
*/
router.post("/create", async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET ALL NOTIFICATIONS FOR A USER
*/
router.get("/user/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.params.userId,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "userName userEmail");

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET UNREAD NOTIFICATIONS COUNT FOR A USER
*/
router.get("/user/:userId/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.params.userId,
      isRead: false,
      isDeleted: false
    });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
MARK NOTIFICATION AS READ
*/
router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
MARK ALL NOTIFICATIONS AS READ FOR A USER
*/
router.put("/user/:userId/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.params.userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
DELETE NOTIFICATION (Soft Delete)
*/
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
