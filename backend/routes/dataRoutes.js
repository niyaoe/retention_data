const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getSalesData,
  getServiceData,
  getDmsRetailData,
} = require("../controllers/dataController");

router.get("/sales", protect, getSalesData);
router.get("/service", protect, getServiceData);
router.get("/dms-retail", protect, getDmsRetailData);

module.exports = router;