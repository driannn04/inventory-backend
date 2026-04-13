const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

// BARANG KELUAR
router.get("/excel/barang-keluar", exportController.exportBarangKeluarExcel);
router.get("/pdf/barang-keluar", exportController.exportBarangKeluarPDF);

// BARANG MASUK
router.get("/excel/barang-masuk", exportController.exportBarangMasukExcel);
router.get("/pdf/barang-masuk", exportController.exportBarangMasukPDF);

// STOK SAAT INI
router.get("/excel/stok", exportController.exportStokExcel);
router.get("/pdf/stok", exportController.exportStokPDF);

module.exports = router;