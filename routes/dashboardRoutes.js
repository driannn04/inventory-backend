const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { verifyToken } = require("../middlewares/auth");

// ✅ Dashboard dilindungi token agar data sensitif tidak bocor
router.get("/", verifyToken, dashboardController.getDashboard);
router.get("/activity", verifyToken, dashboardController.getAktivitas);

module.exports = router;