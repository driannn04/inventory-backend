const db = require("./config/db");

const sql = `
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    category VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

const seeds = [
  ['org_name', 'PDAM Tirta Pakuan Bogor', 'org'],
  ['org_address', 'Jl. Siliwangi No.121, Kota Bogor, Jawa Barat', 'org'],
  ['org_phone', '(0251) 8322305', 'org'],
  ['org_email', 'info@pdamtirtapakuan.co.id', 'org'],
  ['org_unit_code', 'BOGOR-TENGAH-01', 'org'],
  ['stock_threshold', '10', 'pref'],
  ['date_format', 'DD/MM/YYYY', 'pref'],
  ['currency_symbol', 'Rp', 'pref'],
  ['reg_enabled', 'true', 'security'],
  ['maint_mode', 'false', 'security'],
  ['app_logo', '', 'brand'],
  ['app_logo_report', '', 'brand']
];

db.query(sql, (err) => {
  if (err) throw err;
  console.log("✅ Table system_settings ready.");

  seeds.forEach(([key, val, cat]) => {
    const checkSql = "SELECT * FROM system_settings WHERE setting_key = ?";
    db.query(checkSql, [key], (err2, result) => {
      if (err2) throw err2;
      if (result.length === 0) {
        const insertSql = "INSERT INTO system_settings (setting_key, setting_value, category) VALUES (?, ?, ?)";
        db.query(insertSql, [key, val, cat], (err3) => {
          if (err3) throw err3;
          console.log(`🌱 Seeded: ${key}`);
        });
      }
    });
  });
});
