const mysql = require("mysql2");
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "inventory_gudang_pdam"
});

db.query("SELECT u.nama, u.nup, r.nama_role FROM users u JOIN roles r ON u.role_id = r.id LIMIT 10", (err, result) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit();
});
