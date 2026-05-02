const express = require("express");
const router = express.Router();

const {
  tambahStokMasuk,
  getStokMasuk,
  getStokMasukById,
  tambahStokKeluar,
  getStokKeluar,
  getStokKeluarById
} = require("../controllers/stokController");

const { verifyToken, allowRoles } = require("../middlewares/auth");
const activityLogger = require("../middlewares/activityLogger");

// ✅ Stok masuk
router.post("/masuk", verifyToken, allowRoles("gudang", "admin"), activityLogger("Tambah", "Stok Masuk"), tambahStokMasuk);
router.get("/masuk", verifyToken, allowRoles("gudang", "admin", "manager"), getStokMasuk);
router.get("/masuk/:id", verifyToken, allowRoles("gudang", "admin", "manager"), getStokMasukById);

// ✅ Stok keluar
router.post("/keluar", verifyToken, allowRoles("gudang", "admin"), activityLogger("Tambah", "Stok Keluar"), tambahStokKeluar);
router.get("/keluar", verifyToken, allowRoles("gudang", "admin", "manager"), getStokKeluar);
router.get("/keluar/:id", verifyToken, allowRoles("gudang", "admin", "manager"), getStokKeluarById);

module.exports = router;