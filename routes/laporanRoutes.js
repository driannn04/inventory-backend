const express = require("express");
const router = express.Router();

const laporanController = require("../controllers/laporanController");

router.get("/stok",laporanController.laporanStok);

router.get("/barang-masuk",laporanController.laporanBarangMasuk);

router.get("/barang-keluar",laporanController.laporanBarangKeluar);

module.exports = router;