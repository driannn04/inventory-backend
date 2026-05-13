const db = require("../config/db");

const sql = "ALTER TABLE notifikasi ADD COLUMN tipe VARCHAR(20) DEFAULT 'info' AFTER pesan";

db.query(sql, (err) => {
  if (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log("✅ Kolom 'tipe' sudah ada.");
    } else {
      console.error("❌ Gagal menambah kolom:", err);
    }
  } else {
    console.log("✅ Kolom 'tipe' berhasil ditambahkan ke tabel notifikasi.");
  }
  process.exit();
});
