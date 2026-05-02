const db = require("./config/db");

const sql = "ALTER TABLE users ADD COLUMN nup VARCHAR(50) UNIQUE AFTER id";

db.query(sql, (err, result) => {
  if (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log("Column 'nup' already exists.");
    } else {
      console.log("Error adding column 'nup':", err.message);
    }
  } else {
    console.log("Column 'nup' added successfully.");
  }
  process.exit();
});
