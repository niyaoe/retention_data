const express = require("express");
const router = express.Router();

const {
  createManager,
  getManagers,
  updateManager,
  resetManagerPassword,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

router.use(protect, authorize("admin"));

router.post("/managers", createManager);
router.get("/managers", getManagers);
router.put("/managers/:id", updateManager);
router.patch("/managers/:id/password", resetManagerPassword);

module.exports = router;