const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// ✅ MUST be first before anything else
dotenv.config();
console.log("✅ JWT_SECRET loaded:", process.env.JWT_SECRET);

connectDB();

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ FIXED: Removed duplicate /api/auth registration (was registered twice before)
app.use("/api/auth",         require("./routes/authRoutes"));
app.use("/api/users",        require("./routes/userRoutes"));
app.use("/api/stores",       require("./routes/storeRoutes"));
app.use("/api/categories",   require("./routes/categoryRoutes"));
app.use("/api/requirements", require("./routes/requirementRoutes"));
app.use("/api/responses",    require("./routes/responseRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
