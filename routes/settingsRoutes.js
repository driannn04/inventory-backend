const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { verifyToken, allowRoles } = require("../middlewares/auth");
const multer = require("multer");
const path = require("path");

// Konfigurasi Multer untuk Branding
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/branding/");
  },
  filename: (req, file, cb) => {
    cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Pengaturan sistem bisa dibaca oleh semua user terautentikasi (untuk Topbar/Sidebar/Logo)
router.get("/ping", (req, res) => res.json({ message: "Settings API is Alive" }));
router.get("/", verifyToken, settingsController.getSettings);
router.get("/category/:category", verifyToken, settingsController.getSettingsByCategory);

// Hanya Admin yang bisa mengubah pengaturan
router.put("/", [verifyToken, allowRoles("admin")], settingsController.updateSettings);
router.post("/upload/:type", [verifyToken, allowRoles("admin")], upload.single("logo"), settingsController.uploadLogo);
router.get("/backup", verifyToken, settingsController.downloadBackup);

module.exports = router;
