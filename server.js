const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");
const fs = require('fs');
const http = require("http");
const { Server } = require("socket.io");

// MUST be first before anything else
dotenv.config();

// Don't log sensitive data in production
if (process.env.NODE_ENV !== 'production') {
  console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "***" : "NOT SET");
}

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  // Support older servers and reverse proxies
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Store user socket mappings
const userSockets = new Map();
app.locals.userSockets = userSockets;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("register", (userId, storeCategory) => {
    userSockets.set(userId, socket.id);
    console.log("User registered:", userId, "storeCategory:", storeCategory);
    
    // Leave all category rooms first
    const rooms = Array.from(socket.rooms || []).filter(room => room.startsWith('category_'));
    rooms.forEach(room => socket.leave(room));
    
    // Join new category room if store owner
    if (storeCategory) {
      const categoryRoom = `category_${storeCategory.toLowerCase()}`;
      socket.join(categoryRoom);
      console.log("User joined room:", categoryRoom);
    }
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

// Set COOP and COEP headers for Firebase Auth popup compatibility
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add upload route
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/stores", require("./routes/storeRoutes"));
app.use("/api/requirements", require("./routes/requirementRoutes"));
app.use("/api/responses", require("./routes/responseRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/locations", require("./routes/locationRoutes"));

// Error handling middleware for Express 5.x
app.use((err, req, res, next) => {
  console.error("Error handler:", err);
  if (!res.headersSent) {
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Production-ready error handling for older servers
// ---------------------------------------------------------------------------

// Handle uncaught exceptions (synchronization errors, etc.)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION - Shutting down:', err);
  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION - Shutting down:', reason);
  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM (Docker, PM2, etc.)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});