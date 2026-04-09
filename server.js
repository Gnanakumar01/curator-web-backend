const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const fs = require('fs');
const http = require("http");
const { Server } = require("socket.io");

// ✅ MUST be first before anything else
dotenv.config();
console.log("✅ JWT_SECRET loaded:", process.env.JWT_SECRET);

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

// Store user socket mappings
const userSockets = new Map();
app.locals.userSockets = userSockets;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register", (userId) => {
    userSockets.set(userId, socket.id);
    console.log("User registered:", userId);
  });

  socket.on("disconnect", () => {
    for (let [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log("Client disconnected:", socket.id);
  });
});

// Make io available to routes
app.set("io", io);

// Helper function to send notification to a user
app.locals.sendNotification = (userId, notification) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit("notification", notification);
  }
};

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Add upload route
const uploadRoutes = require("./routes/uploadRoutes");
app.use("/api/upload", uploadRoutes);

app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/stores", require("./routes/storeRoutes"));
// app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/requirements", require("./routes/requirementRoutes"));
app.use("/api/responses", require("./routes/responseRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/locations", require("./routes/locationRoutes"));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});