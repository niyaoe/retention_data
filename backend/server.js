const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const dealerLocationRoutes = require("./routes/dealerLocationRoutes");

const dmsRetailRoutes = require("./routes/dmsRetailRoutes");
const dataRoutes = require("./routes/dataRoutes");
const startImportScheduler = require("./jobs/importScheduler");
const salesImportRoutes = require("./routes/salesImportRoutes");
const serviceImportRoutes = require("./routes/serviceImportRoutes");
const importHistoryRoutes = require("./routes/importHistoryRoutes");
const vehicleModelRoutes = require("./routes/vehicleModelRoutes");
const vehicleModelImportRoutes = require("./routes/vehicleModelImportRoutes");
const branchRoutes = require("./routes/branchRoutes");



const app = express();

app.use(cors());
app.use(express.json());

connectDB();
startImportScheduler();

app.use("/api/auth", authRoutes);
app.use("/api/locations", dealerLocationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/import", salesImportRoutes);
app.use("/api/import", serviceImportRoutes);
app.use("/api/import-history", importHistoryRoutes);
app.use("/api/vehicle-models/import", vehicleModelImportRoutes);
app.use("/api/vehicle-models", vehicleModelRoutes);
app.use("/api/branches", branchRoutes);


app.use("/api/dms-retail", dmsRetailRoutes);
app.use("/api/data", dataRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "Retention Data API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});