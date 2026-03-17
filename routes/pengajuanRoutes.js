const express = require("express");
const router = express.Router();

const pengajuanController = require("../controllers/pengajuanController");

router.post("/",pengajuanController.createPengajuan);
router.get("/",pengajuanController.getPengajuan);
router.get("/:id",pengajuanController.getPengajuanById);
router.post("/approve",pengajuanController.approvePengajuan);
router.post("/reject",pengajuanController.rejectPengajuan);

module.exports = router;
