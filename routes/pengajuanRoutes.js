const express = require("express");
const router = express.Router();

const pengajuanController = require("../controllers/pengajuanController");
const { verifyToken, allowRoles } = require("../middlewares/auth");
const activityLogger = require("../middlewares/activityLogger");

// ✅ FIX URUTAN ROUTE: spesifik dulu, baru dynamic /:id
// Kalau /:id di atas, Express tangkap /approve & /history sebagai id

// POST buat pengajuan — staff & admin
router.post(
  "/",
  verifyToken,
  allowRoles("staff", "admin", "manager"),
  activityLogger("Tambah", "Pengajuan Baru"),
  pengajuanController.createPengajuan
);

// GET semua pengajuan (filter otomatis by role di controller)
router.get(
  "/",
  verifyToken,
  pengajuanController.getPengajuan
);

// ✅ SPESIFIK DULU sebelum /:id
// POST approve
router.post(
  "/approve",
  verifyToken,
  allowRoles("asesmen", "manager", "gudang", "admin"),
  activityLogger("Approval", "Konfirmasi Pengajuan"),
  pengajuanController.approvePengajuan
);

// POST reject
router.post(
  "/reject",
  verifyToken,
  allowRoles("asesmen", "manager", "gudang", "admin"),
  activityLogger("Penolakan", "Pembatalan Pengajuan"),
  pengajuanController.rejectPengajuan
);

// GET history approval by pengajuan_id
router.get(
  "/history/:id",
  verifyToken,
  pengajuanController.getApprovalHistory
);

// GET detail pengajuan by id — dynamic param PALING BAWAH
router.get(
  "/:id",
  verifyToken,
  pengajuanController.getPengajuanById
);

module.exports = router;