const db = require("./config/db");

const sql = `
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  aksi VARCHAR(50) NOT NULL,
  tipe_data VARCHAR(50) NOT NULL,
  target_id INT DEFAULT NULL,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(sql, (err, result) => {
  if (err) {
    console.error("❌ Gagal membuat tabel activity_logs:", err.message);
    process.exit(1);
  }
  console.log("✅ Tabel activity_logs berhasil dibuat atau sudah ada.");
  process.exit(0);
});
