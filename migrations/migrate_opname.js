const db = require("./config/db");

const sql = `
CREATE TABLE IF NOT EXISTS stock_opname (
  id INT NOT NULL AUTO_INCREMENT,
  barang_id INT NOT NULL,
  stok_sistem INT NOT NULL,
  stok_fisik INT NOT NULL,
  selisih INT NOT NULL,
  catatan TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (barang_id) REFERENCES barang(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(sql, (err, result) => {
  if (err) {
    console.error("❌ Gagal membuat tabel stock_opname:", err.message);
    process.exit(1);
  }
  console.log("✅ Tabel stock_opname berhasil dibuat atau sudah ada.");
  process.exit(0);
});
