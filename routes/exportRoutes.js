const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// ✅ Export dilindungi token + role

// BARANG KELUAR
router.get("/excel/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), exportController.exportBarangKeluarExcel);
router.get("/pdf/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), exportController.exportBarangKeluarPDF);

// BARANG MASUK
router.get("/excel/barang-masuk", verifyToken, allowRoles("admin", "gudang"), exportController.exportBarangMasukExcel);
router.get("/pdf/barang-masuk", verifyToken, allowRoles("admin", "gudang"), exportController.exportBarangMasukPDF);

// STOK SAAT INI
router.get("/excel/stok", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), exportController.exportStokExcel);
router.get("/pdf/stok", verifyToken, allowRoles("admin", "gudang", "manager", "asisten_manager"), exportController.exportStokPDF);

// RIWAYAT PENGAJUAN (Dihapus sesuai permintaan)

module.exports = router;