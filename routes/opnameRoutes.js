const express = require("express");
const router = express.Router();
const opnameController = require("../controllers/opnameController");
const { verifyToken, allowRoles } = require("../middlewares/auth");
const activityLogger = require("../middlewares/activityLogger");

router.post("/", verifyToken, allowRoles("admin", "gudang"), activityLogger("Audit", "Stok"), opnameController.createOpname);
router.get("/history", verifyToken, opnameController.getOpnameHistory);

module.exports = router;
