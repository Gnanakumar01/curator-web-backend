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
      .sort({ createdAt: -1 });

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