const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  previewServiceExcel,
  importServiceData,
  importServiceFromUrl,
} = require("../controllers/serviceImportController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

// Service Excel preview
router.post(
  "/preview/service",
  upload.single("file"),
  previewServiceExcel
);

// Service Excel import
router.post(
  "/service",
  upload.single("file"),
  importServiceData
);

router.post("/service-url", importServiceFromUrl);

module.exports = router;