const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// ✅ Export dilindungi token + role (admin, gudang, manager)

// BARANG KELUAR
router.get("/excel/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportBarangKeluarExcel);
router.get("/pdf/barang-keluar", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportBarangKeluarPDF);

// BARANG MASUK
router.get("/excel/barang-masuk", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportBarangMasukExcel);
router.get("/pdf/barang-masuk", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportBarangMasukPDF);

// STOK SAAT INI
router.get("/excel/stok", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportStokExcel);
router.get("/pdf/stok", verifyToken, allowRoles("admin", "gudang", "manager"), exportController.exportStokPDF);

module.exports = router;