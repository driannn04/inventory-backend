const express = require("express");
const router = express.Router();
const satuanController = require("../controllers/satuanController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

router.get("/", verifyToken, satuanController.getSatuan);
router.post("/", verifyToken, allowRoles("admin", "gudang"), satuanController.createSatuan);

module.exports = router;
