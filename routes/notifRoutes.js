const express = require("express");
const router = express.Router();
const notifController = require("../controllers/notifController");

// ✅ FIX: Route spesifik HARUS di atas route dynamic param
// Kalau /:user_id di atas, Express akan salah tangkap /read/:id sebagai user_id

// READ (spesifik dulu)
router.put("/read-all/:user_id", notifController.readAllNotif);
router.put("/read/:id", notifController.readNotif);

// GET (dynamic param, taruh setelah yang spesifik)
router.get("/:user_id", notifController.getNotifikasi);

// DELETE
router.delete("/:id", notifController.deleteNotif);

module.exports = router;