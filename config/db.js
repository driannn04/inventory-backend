require('dotenv').config();
const mysql = require("mysql2");

// Menggunakan createPool: Standar Industri untuk Deployment (Production)
// Menangani banyak koneksi sekaligus dengan lebih efisien dan stabil
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventory_gudang_pdam",
  waitForConnections: true,
  connectionLimit: 3, // Turunkan ke 3 karena paket gratis Clever Cloud cuma kasih jatah 5
  queueLimit: 0
});

// Cek koneksi pool
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected via Connection Pool (Production Ready)");
    connection.release(); // Kembalikan koneksi ke pool
  }
});

module.exports = db;