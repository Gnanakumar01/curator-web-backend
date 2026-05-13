const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Connection options for better compatibility with older servers
    const options = {
      maxPoolSize: 10, // Limit connection pool for older servers
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4 for better compatibility
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;