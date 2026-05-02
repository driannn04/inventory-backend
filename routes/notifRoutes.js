const express = require("express");
const router = express.Router();
const notifController = require("../controllers/notifController");
const { verifyToken } = require("../middlewares/auth");

// ✅ FIX: Route spesifik HARUS di atas route dynamic param
// Kalau /:user_id di atas, Express akan salah tangkap /read/:id sebagai user_id

// ✅ Semua route notifikasi dilindungi token
// READ (spesifik dulu)
router.put("/read-all/:user_id", verifyToken, notifController.readAllNotif);
router.put("/read/:id", verifyToken, notifController.readNotif);

// GET (dynamic param, taruh setelah yang spesifik)
router.get("/:user_id", verifyToken, notifController.getNotifikasi);

// DELETE
router.delete("/:id", verifyToken, notifController.deleteNotif);

module.exports = router;