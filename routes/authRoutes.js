const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/auth");

// Public
router.post("/login",    authController.login);
router.get("/check-nup/:nup", authController.checkNup);

// ✅ Tambah: cek token aktif (dipakai frontend saat refresh halaman)
router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// FCM Token management
router.post("/fcm-token", verifyToken, authController.saveFcmToken);
router.delete("/fcm-token", verifyToken, authController.deleteFcmToken);

module.exports = router;