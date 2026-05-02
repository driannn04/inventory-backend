const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "inventory_gudang_pdam"
});

const createTableSql = `
CREATE TABLE IF NOT EXISTS satuan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_satuan VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const seedSql = `
INSERT IGNORE INTO satuan (nama_satuan) VALUES 
('Pcs'), 
('Dus'), 
('Unit'), 
('Batang');
`;

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to DB");

  db.query(createTableSql, (err) => {
    if (err) throw err;
    console.log("Table 'satuan' created or already exists.");

    db.query(seedSql, (err) => {
      if (err) throw err;
      console.log("Initial units seeded.");
      db.end();
    });
  });
});
