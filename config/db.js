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

    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/curator";
    await mongoose.connect(mongoUri, options);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;