const db = require("./config/db");

const queries = [
  // Tambah kolom baru di tabel users
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS no_telp VARCHAR(20) DEFAULT NULL AFTER email`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS jabatan VARCHAR(100) DEFAULT NULL AFTER no_telp`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS departemen VARCHAR(100) DEFAULT NULL AFTER jabatan`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL AFTER departemen`,

  // Tambah kolom untuk kategori (jika tabel belum ada created_at)
  `ALTER TABLE kategori_barang ADD COLUMN IF NOT EXISTS deskripsi TEXT DEFAULT NULL AFTER nama_kategori`,
  `ALTER TABLE kategori_barang ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER deskripsi`,
];

let completed = 0;

queries.forEach((sql, index) => {
  db.query(sql, (err) => {
    if (err) {
      // Kolom mungkin sudah ada, skip
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`⚠️  [${index + 1}] Kolom sudah ada, skip.`);
      } else {
        console.log(`❌ [${index + 1}] Error:`, err.message);
      }
    } else {
      console.log(`✅ [${index + 1}] Berhasil.`);
    }

    completed++;
    if (completed === queries.length) {
      console.log("\n🎉 Migrasi selesai!");
      process.exit(0);
    }
  });
});
