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

module.exports = router;