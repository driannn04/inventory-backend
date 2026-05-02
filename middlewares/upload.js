const multer = require("multer");

// Gunakan memoryStorage agar file tidak langsung ditulis ke disk
// Kita akan memprosesnya dengan Sharp (Rename & Compress) di helper
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit awal 5MB (akan dikompres jadi < 3MB oleh Sharp)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan!"), false);
    }
  }
});

module.exports = upload;