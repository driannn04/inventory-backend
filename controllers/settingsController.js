const db = require("../config/db");
const path = require("path");
const fs = require("fs");

// ==========================================
// GET ALL SETTINGS
// ==========================================
exports.getSettings = (req, res) => {
  const sql = "SELECT setting_key, setting_value, category FROM system_settings";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    const settings = {};
    result.forEach(row => settings[row.setting_key] = row.setting_value);
    res.json(settings);
  });
};

// ==========================================
// UPDATE SETTINGS (BULK)
// ==========================================
exports.updateSettings = (req, res) => {
  const newSettings = req.body;
  if (!newSettings || Object.keys(newSettings).length === 0) {
    return res.status(400).json({ message: "Data tidak valid" });
  }

  db.beginTransaction((err) => {
    if (err) return res.status(500).json(err);

    const promises = Object.entries(newSettings).map(([key, value]) => {
      return new Promise((resolve, reject) => {
        const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
        db.query(sql, [value, key], (err2) => {
          if (err2) reject(err2);
          else resolve();
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        db.commit((err3) => {
          if (err3) db.rollback(() => res.status(500).json(err3));
          else res.json({ message: "Pengaturan berhasil diperbarui" });
        });
      })
      .catch((err4) => db.rollback(() => res.status(500).json(err4)));
  });
};

// ==========================================
// UPLOAD LOGO
// =============================
exports.uploadLogo = (req, res) => {
  const type = req.params.type; // 'app_logo' atau 'app_logo_report'
  if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });

  const logoUrl = `/uploads/branding/${req.file.filename}`;
  const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";

  db.query(sql, [logoUrl, type], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Logo berhasil diperbarui", url: logoUrl });
  });
};

// ==========================================
// REAL SQL BACKUP GENERATOR
// ==========================================
exports.downloadBackup = async (req, res) => {
  const tables = ['users', 'roles', 'kategori_barang', 'supplier', 'barang', 'stok_masuk', 'stok_keluar', 'pengajuan', 'pengajuan_detail', 'system_settings'];
  let sqlDump = `-- PDAM TIRTA PAKUAN DATABASE BACKUP\n-- Generated: ${new Date().toLocaleString()}\n\n`;
  sqlDump += "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\nSTART TRANSACTION;\n\n";

  try {
    for (const table of tables) {
      const data = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM ${table}`, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (data.length > 0) {
        sqlDump += `-- Dumping data for table: ${table}\n`;
        const columns = Object.keys(data[0]).join(", ");
        data.forEach(row => {
          const values = Object.values(row).map(v => {
            if (v === null) return "NULL";
            if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
            if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return v;
          }).join(", ");
          sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
        });
        sqlDump += "\n";
      }
    }

    sqlDump += "COMMIT;";
    const filename = `backup_pdam_${new Date().toISOString().slice(0,10)}.sql`;
    
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/sql");
    res.send(sqlDump);

  } catch (err) {
    res.status(500).json({ message: "Gagal membuat backup", error: err.message });
  }
};

exports.getSettingsByCategory = (req, res) => {
  const { category } = req.params;
  const sql = "SELECT setting_key, setting_value FROM system_settings WHERE category = ?";
  db.query(sql, [category], (err, result) => {
    if (err) return res.status(500).json(err);
    const settings = {};
    result.forEach(row => settings[row.setting_key] = row.setting_value);
    res.json(settings);
  });
};
