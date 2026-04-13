const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const barangController = require("../controllers/barangController");
const { verifyToken, allowRoles } = require("../middlewares/auth");
const activityLogger = require("../middlewares/activityLogger");

// ✅ SPECIFIC ROUTES DULU (sebelum /:id)
router.get("/qr/download/:id", verifyToken, barangController.downloadQR);
router.get("/qr/:id",          verifyToken, barangController.generateQR);
router.post("/scan",           verifyToken, barangController.scanQR);
router.get("/search",          verifyToken, barangController.searchBarang);
router.get("/stok-minimum",    verifyToken, barangController.getStokMinimum);
router.get("/kartu-stok/:id",  verifyToken, barangController.getKartuStokByBarang);
router.get("/kartu-stok/:id/export/excel", verifyToken, barangController.exportKartuStokExcel);
router.get("/kartu-stok/:id/export/pdf", verifyToken, barangController.exportKartuStokPDF);
router.get("/pagination",      verifyToken, barangController.getBarangPagination);

// ✅ GENERAL — semua role bisa lihat barang
router.get("/",    verifyToken, barangController.getBarang);
router.get("/:id", verifyToken, barangController.getBarangById);

// ✅ Tambah/edit/hapus — hanya admin
router.post("/",    verifyToken, allowRoles("admin"), activityLogger("Tambah", "Barang"), upload.single("foto"), barangController.tambahBarang);
router.put("/:id",  verifyToken, allowRoles("admin"), activityLogger("Edit", "Barang"), upload.single("foto"), barangController.updateBarang);
router.delete("/:id", verifyToken, allowRoles("admin"), activityLogger("Hapus", "Barang"), barangController.deleteBarang);

module.exports = router;