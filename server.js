const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/stores", require("./routes/storeRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/requirements", require("./routes/requirementRoutes"));
app.use("/api/responses", require("./routes/responseRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});