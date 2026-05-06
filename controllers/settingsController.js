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

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);

    conn.beginTransaction((err) => {
      if (err) { conn.release(); return res.status(500).json(err); }

      const promises = Object.entries(newSettings).map(([key, value]) => {
        return new Promise((resolve, reject) => {
          const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";
          conn.query(sql, [value, key], (err2) => {
            if (err2) reject(err2);
            else resolve();
          });
        });
      });

      Promise.all(promises)
        .then(() => {
          conn.commit((err3) => {
            if (err3) return conn.rollback(() => { conn.release(); res.status(500).json(err3); });
            conn.release();
            res.json({ message: "Pengaturan berhasil diperbarui" });
          });
        })
        .catch((err4) => conn.rollback(() => { conn.release(); res.status(500).json(err4); }));
    });
  });
};

// ==========================================
// UPLOAD LOGO
// =============================
exports.uploadLogo = async (req, res) => {
  const type = req.params.type; // 'app_logo' atau 'app_logo_report'
  if (!req.file) return res.status(400).json({ message: "File tidak ditemukan" });

  try {
    const { processImage } = require("../utils/uploadHelper");
    // Simpan ke category "branding" tanpa ID subfolder
    const dbPath = await processImage(req.file, "branding");
    
    // Prefix dengan /uploads/ agar frontend bisa baca
    const logoUrl = `/uploads/${dbPath}`;
    const sql = "UPDATE system_settings SET setting_value = ? WHERE setting_key = ?";

    db.query(sql, [logoUrl, type], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Logo berhasil diperbarui", url: logoUrl });
    });
  } catch (imgErr) {
    console.error("❌ Gagal memproses logo:", imgErr.message);
    res.status(500).json({ message: "Gagal memproses gambar" });
  }
};

// ==========================================
// REAL SQL BACKUP GENERATOR
// ==========================================
exports.downloadBackup = async (req, res) => {
  // Ambil daftar tabel yang ada di database secara dinamis
  const getTablesSql = "SHOW TABLES";
  
  let sqlDump = `-- PDAM TIRTA PAKUAN DATABASE BACKUP\n`;
  sqlDump += `-- Generated: ${new Date().toLocaleString()}\n\n`;
  sqlDump += "SET FOREIGN_KEY_CHECKS = 0;\n";
  sqlDump += "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
  sqlDump += "START TRANSACTION;\n\n";

  try {
    const tablesRes = await new Promise((resolve, reject) => {
      db.query(getTablesSql, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });

    const dbName = db.config.database || 'database';
    const tableList = tablesRes.map(row => Object.values(row)[0]);

    for (const table of tableList) {
      // 1. Get CREATE TABLE schema
      const createTableSql = await new Promise((resolve, reject) => {
        db.query(`SHOW CREATE TABLE \`${table}\``, (err, res) => {
          if (err) reject(err);
          else resolve(res[0]['Create Table']);
        });
      });

      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `-- Table structure for table: \`${table}\`\n`;
      sqlDump += `-- --------------------------------------------------------\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sqlDump += `${createTableSql};\n\n`;

      // 2. Get Data
      const data = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM \`${table}\``, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (data.length > 0) {
        sqlDump += `-- Dumping data for table: \`${table}\`\n`;
        const columns = Object.keys(data[0]).map(col => `\`${col}\``).join(", ");
        
        data.forEach(row => {
          const values = Object.values(row).map(v => {
            if (v === null) return "NULL";
            if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
            if (v instanceof Date) {
                // Format date ke YYYY-MM-DD HH:mm:ss lokal
                const offset = v.getTimezoneOffset();
                const localDate = new Date(v.getTime() - (offset * 60 * 1000));
                return `'${localDate.toISOString().slice(0, 19).replace('T', ' ')}'`;
            }
            if (typeof v === "boolean") return v ? 1 : 0;
            return v;
          }).join(", ");
          sqlDump += `INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`;
        });
        sqlDump += "\n";
      }
    }

    sqlDump += "SET FOREIGN_KEY_CHECKS = 1;\n";
    sqlDump += "COMMIT;";
    
    const filename = `backup_pdam_${new Date().toISOString().slice(0,10)}.sql`;
    
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/sql");
    res.send(sqlDump);

  } catch (err) {
    console.error("Backup Error:", err);
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

// ==========================================
// DANGER ZONE: CLEAR CACHE
// ==========================================
exports.clearCache = (req, res) => {
  try {
    const sharp = require("sharp");
    // Bersihkan cache internal Sharp (pemrosesan gambar)
    sharp.cache(false);
    sharp.cache(true);
    
    // 🔥 LOG AKTIVITAS
    const { logActivity } = require("../utils/activityLogger");
    logActivity(req.user.id, "CLEAN", "SYSTEM", "Membersihkan cache sistem dan library gambar");

    res.json({ message: "Cache sistem berhasil dibersihkan" });
  } catch (err) {
    res.status(500).json({ message: "Gagal membersihkan cache", error: err.message });
  }
};
