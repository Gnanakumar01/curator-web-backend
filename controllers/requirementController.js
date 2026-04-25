const Requirement = require("../models/Requirement");

/*
CREATE REQUIREMENT
*/
exports.createRequirement = async (req, res) => {
  try {
    const {
      reqCategory,
      reqTitle,
      reqDocs,
      reqDesc,
      deadLineDate,
      targetLocation,
      deliveryDate,
      expectedBudget,
      reqOwner,
      userType,
      createdBy,
      reqAudio
    } = req.body;

    // ✅ Basic validation
    if (!reqTitle || !reqCategory || !userType || !createdBy) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    const newRequirement = new Requirement({
      reqCategory,
      reqTitle,
      reqDocs,
      reqDesc,
      deadLineDate,
      targetLocation,
      deliveryDate,
      expectedBudget,
      reqOwner,
      userType,
      createdBy,
      reqAudio
    });

    await newRequirement.save();

    // Populate createdBy for socket emission (needed for client-side filtering)
    await newRequirement.populate("createdBy", "firstName lastName email");

    const io = req.app.get("io");
    if (io) {
      // Emit to all clients (for client-side filtering)
      io.emit("newRequirement", newRequirement);
      
      // Also emit to specific category room for targeted notifications
      const category = newRequirement.reqCategory?.toLowerCase();
      if (category) {
        io.to(`category_${category}`).emit("newRequirement", newRequirement);
        console.log(`Emitted newRequirement to category_${category} room`);
      }
    }

    res.status(201).json({
      success: true,
      data: newRequirement
    });

  } catch (error) {
    console.error("Create Requirement Error:", error);
    res.status(500).json({
      message: error.message
    });
  }
};


/*
GET ALL REQUIREMENTS
*/
exports.getRequirements = async (req, res) => {
  try {
    const requirements = await Requirement.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      data: requirements
    });

  } catch (error) {
    console.error("Get Requirements Error:", error);
    res.status(500).json({
      message: error.message
    });
  }
};