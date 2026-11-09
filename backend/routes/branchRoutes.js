
const express = require("express");
const router = express.Router();
const {
    previewBranchExcel,
    importBranchExcel,
} = require("../controllers/branchImportController");

const upload = require("../middleware/uploadMiddleware");

const {
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch,
} = require("../controllers/branchController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");


// All branch management routes require admin access
router.use(protect);
router.use(authorize("admin"));

// GET all branches
router.get("/", getBranches);

// GET single branch
router.get("/:id", getBranchById);

// CREATE branch
router.post("/", createBranch);

// UPDATE branch
router.put("/:id", updateBranch);

// DEACTIVATE branch
router.delete("/:id", deleteBranch);

// BRANCH EXCEL IMPORT
router.post(
    "/excel/preview",
    upload.single("file"),
    previewBranchExcel
);

router.post(
    "/excel/import",
    upload.single("file"),
    importBranchExcel
);

module.exports = router;
