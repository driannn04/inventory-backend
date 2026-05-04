require('dotenv').config();
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventory_gudang_pdam",
  waitForConnections: true,
  connectionLimit: 3, 
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// Cek koneksi pool
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected via Connection Pool (Production Ready)");
    connection.release();
  }
});

module.exports = db;