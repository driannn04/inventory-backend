const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.get("/excel/barang-keluar",exportController.exportBarangKeluarExcel);
router.get("/pdf/barang-keluar",exportController.exportBarangKeluarPDF);

module.exports = router;