
const express = require("express");
const router = express.Router();

const {
  createVehicleModel,
  getVehicleModels,
  updateVehicleModel,
  deleteVehicleModel,
} = require("../controllers/vehicleModelController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", getVehicleModels);
router.post("/", createVehicleModel);
router.put("/:id", updateVehicleModel);
router.delete("/:id", deleteVehicleModel);

module.exports = router;
