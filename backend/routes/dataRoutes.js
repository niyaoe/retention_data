
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getSalesData,
  getServiceData,
  getDmsRetailData,
  getSalesMasterData,
  getSalesMasterFilterOptions,
} = require("../controllers/dataController");

router.get("/sales", protect, getSalesData);
router.get("/service", protect, getServiceData);
router.get("/dms-retail", protect, getDmsRetailData);



// Master Data
router.get("/master-data/sales", protect, getSalesMasterData);
router.get(
  "/master-data/sales/filter-options",
  protect,
  getSalesMasterFilterOptions
);

module.exports = router;
