const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

router.get("/", verifyToken, allowRoles("admin"), auditController.getLogs);
router.get("/export", verifyToken, allowRoles("admin"), auditController.exportLogs);
router.post("/login", auditController.logLogin);

module.exports = router;
