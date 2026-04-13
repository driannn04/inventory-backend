const db = require("./config/db");

const setup = async () => {
  console.log("🚀 Menjalankan migrasi penyempurnaan Supplier...");

  // 1. Tambah supplier_id ke stok_masuk
  const sqlStokMasuk = `
    ALTER TABLE stok_masuk 
    ADD COLUMN supplier_id INT(11) DEFAULT NULL AFTER barang_id,
    ADD CONSTRAINT fk_stok_masuk_supplier 
    FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL;
  `;

  // 2. Tambah kolom profesional ke supplier
  const sqlSupplier = `
    ALTER TABLE supplier 
    ADD COLUMN kode_supplier VARCHAR(50) UNIQUE DEFAULT NULL AFTER id,
    ADD COLUMN pic VARCHAR(100) DEFAULT NULL AFTER nama_supplier,
    ADD COLUMN email VARCHAR(100) DEFAULT NULL AFTER no_telp,
    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER alamat;
  `;

  db.query(sqlStokMasuk, (err) => {
    if (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("⚠️ Kolom 'supplier_id' sudah ada di tabel stok_masuk.");
      } else {
        console.error("❌ Gagal modifikasi stok_masuk:", err.message);
      }
    } else {
      console.log("✅ Kolom 'supplier_id' berhasil ditambahkan ke tabel stok_masuk.");
    }

    db.query(sqlSupplier, (err2) => {
      if (err2) {
        if (err2.code === 'ER_DUP_FIELDNAME') {
          console.log("⚠️ Kolom profesional sudah ada di tabel supplier.");
        } else {
          console.error("❌ Gagal modifikasi supplier:", err2.message);
        }
      } else {
        console.log("✅ Kolom profesional (kode, pic, email, created_at) berhasil ditambahkan.");
      }

      console.log("🎉 Migrasi database Supplier selesai!");
      process.exit(0);
    });
  });
};

setup();
