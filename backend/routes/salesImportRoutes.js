const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  previewSalesExcel,
  importSalesData,
  importSalesFromUrl,
  migrateExistingSalesBranches,
} = require("../controllers/salesImportController");

const { protect } = require("../middleware/authMiddleware");

const { authorize } = require("../middleware/roleMiddleware");


router.use(protect);

// Sales Excel preview
router.post(
  "/preview/sales",
  upload.single("file"),
  previewSalesExcel
);

// Sales Excel import
router.post(
  "/sales",
  upload.single("file"),
  importSalesData
);

// Sales CSV URL import
router.post(
  "/sales-url",
  importSalesFromUrl
);

// Historical Sales branch migration (Admin only)
router.post(
  "/sales/migrate-branches",
  authorize("admin"),
  migrateExistingSalesBranches
);

module.exports = router;