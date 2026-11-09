const express = require("express");
const router = express.Router();

const {
  createLocation,
  getLocations,
  updateLocation,
  toggleLocationStatus,
} = require("../controllers/dealerLocationController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.use(protect, authorize("admin"));

router.post("/", createLocation);
router.get("/", getLocations);
router.put("/:id", updateLocation);
router.patch("/:id/status", toggleLocationStatus);

module.exports = router;