const express = require("express");
const router = express.Router();

const laporanController = require("../controllers/laporanController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// ✅ Laporan dilindungi token + role
router.get("/stok", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), laporanController.laporanStok);
router.get("/barang-masuk", verifyToken, allowRoles("admin", "gudang"), laporanController.laporanBarangMasuk);
router.get("/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), laporanController.laporanBarangKeluar);
router.get("/pengajuan", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), laporanController.laporanPengajuan);

module.exports = router;