const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// Hanya Admin yang bisa mengakses fitur pemeliharaan
router.get("/backup", [verifyToken, allowRoles("admin")], settingsController.downloadBackup);
router.post("/clear-cache", [verifyToken, allowRoles("admin")], settingsController.clearCache);

module.exports = router;
