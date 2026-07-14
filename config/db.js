const mysql = require("mysql2");

// Gunakan createPool agar narik data di lokal jadi super kencang!
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventory_gudang_pdam",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 20, // Tambah limit agar responsif
  queueLimit: 0
});

console.log(`📡 Mencoba konek ke DB: ${process.env.DB_HOST} | User: ${process.env.DB_USER} | DB: ${process.env.DB_NAME}`);

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ KONEKSI GAGAL! Detail Error:", err.code, "|", err.message);
  } else {
    console.log("✅ Database Berhasil Terkoneksi ke:", process.env.DB_HOST);
    connection.release();

    // Create user_fcm_tokens table if it doesn't exist
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS user_fcm_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'android',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_token (user_id, token),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    db.query(createTableSql, (tableErr) => {
      if (tableErr) {
        console.error("❌ Gagal membuat/memverifikasi tabel user_fcm_tokens:", tableErr.message);
      } else {
        console.log("✅ Tabel user_fcm_tokens terverifikasi (ready)");
      }
    });
  }
});

module.exports = db;