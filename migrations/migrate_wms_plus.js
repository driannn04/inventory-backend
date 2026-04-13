const db = require("./config/db");

const sql = `
  -- 1. Tambah urgensi ke pengajuan
  ALTER TABLE pengajuan 
  ADD COLUMN urgensi ENUM('normal', 'penting', 'darurat') DEFAULT 'normal' AFTER status;

  -- 2. Pastikan lokasi_rak ada di barang (pakai IGNORE ERROR jika susah, tapi di sini kita pakai query terpisah)
`;

const setup = async () => {
  console.log("🚀 Menjalankan migrasi WMS Excellence...");

  // Tambah urgensi
  db.query("ALTER TABLE pengajuan ADD COLUMN urgensi ENUM('normal', 'penting', 'darurat') DEFAULT 'normal' AFTER status", (err) => {
    if (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("⚠️ Kolom 'urgensi' sudah ada.");
      } else {
        console.error("❌ Gagal tambah urgensi:", err.message);
      }
    } else {
      console.log("✅ Kolom 'urgensi' berhasil ditambahkan ke tabel pengajuan.");
    }

    // Cek lokasi_rak
    db.query("DESCRIBE barang", (err2, result) => {
      const hasLokasi = result.some(r => r.Field === 'lokasi_rak');
      if (!hasLokasi) {
        db.query("ALTER TABLE barang ADD COLUMN lokasi_rak VARCHAR(50) DEFAULT NULL AFTER stok_minimum", (err3) => {
          if (err3) console.error("❌ Gagal tambah lokasi_rak:", err3.message);
          else console.log("✅ Kolom 'lokasi_rak' berhasil ditambahkan ke tabel barang.");
          process.exit(0);
        });
      } else {
        console.log("⚠️ Kolom 'lokasi_rak' sudah ada di tabel barang.");
        process.exit(0);
      }
    });
  });
};

setup();
