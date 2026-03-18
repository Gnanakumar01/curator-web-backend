const User = require("../models/User");
const jwt = require("jsonwebtoken");

/*
REGISTER
*/
exports.register = async (req, res) => {
  try {
    const user = await User.create(req.body);

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/*
LOGIN (EMAIL ONLY)
*/
exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/*
GOOGLE LOGIN (🔥 IMPORTANT FOR YOUR APP)
*/
exports.googleLogin = async (req, res) => {
  try {
    const { name, email } = req.body;

    let user = await User.findOne({ email });

    // ✅ If user doesn't exist → create
    if (!user) {
      user = await User.create({
        firstName: name,
        email,
        userType: "customer" // default
      });
    }

    // ✅ Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};