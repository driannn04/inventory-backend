const express = require("express");
const router = express.Router();

const laporanController = require("../controllers/laporanController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// ✅ Laporan dilindungi token + role (admin, gudang, manager)
router.get("/stok", verifyToken, allowRoles("admin", "gudang", "manager"), laporanController.laporanStok);
router.get("/barang-masuk", verifyToken, allowRoles("admin", "gudang", "manager"), laporanController.laporanBarangMasuk);
router.get("/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager"), laporanController.laporanBarangKeluar);

module.exports = router;