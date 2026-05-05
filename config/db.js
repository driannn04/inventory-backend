require('dotenv').config();
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

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database lokal gagal konek:", err.message);
  } else {
    console.log("✅ Database Lokal Terkoneksi (High Speed Mode)");
    connection.release();
  }
});

module.exports = db;