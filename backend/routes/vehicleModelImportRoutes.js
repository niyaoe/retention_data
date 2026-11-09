
const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  importVehicleModels,
} = require("../controllers/vehicleModelImportController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post(
  "/",
  upload.single("file"),
  importVehicleModels
);

module.exports = router;
