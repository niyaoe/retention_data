
const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const {
  importDmsRetail,
  importDmsRetailFromUrl,
} = require("../controllers/dmsRetailController");

const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/import", upload.single("file"), importDmsRetail);

router.post("/import-url", importDmsRetailFromUrl);

module.exports = router;
