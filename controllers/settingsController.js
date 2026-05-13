const db = require("../config/db");

// ==========================================
// REAL SQL BACKUP GENERATOR
// ==========================================
exports.downloadBackup = async (req, res) => {
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

    const tableList = tablesRes.map(row => Object.values(row)[0]);

    for (const table of tableList) {
      const createTableSql = await new Promise((resolve, reject) => {
        db.query(`SHOW CREATE TABLE \`${table}\``, (err, res) => {
          if (err) reject(err);
          else resolve(res[0]['Create Table']);
        });
      });

      sqlDump += `-- Table structure for table: \`${table}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
      sqlDump += `${createTableSql};\n\n`;

      const data = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM \`${table}\``, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      if (data.length > 0) {
        const columns = Object.keys(data[0]).map(col => `\`${col}\``).join(", ");
        data.forEach(row => {
          const values = Object.values(row).map(v => {
            if (v === null) return "NULL";
            if (typeof v === "string") return `'${v.replace(/'/g, "''")}'`;
            if (v instanceof Date) {
                const offset = v.getTimezoneOffset();
                const localDate = new Date(v.getTime() - (offset * 60 * 1000));
                return `'${localDate.toISOString().slice(0, 19).replace('T', ' ')}'`;
            }
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
    const { logActivity } = require("../utils/activityLogger");
    logActivity(req.user.id, "BACKUP", "SYSTEM", `Mendownload backup database: ${filename}`, { req });

    res.send(sqlDump);

  } catch (err) {
    res.status(500).json({ message: "Gagal membuat backup", error: err.message });
  }
};

// ==========================================
// DANGER ZONE: CLEAR CACHE
// ==========================================
exports.clearCache = (req, res) => {
  try {
    const sharp = require("sharp");
    sharp.cache(false);
    sharp.cache(true);
    
    const { logActivity } = require("../utils/activityLogger");
    logActivity(req.user.id, "CLEAN", "SYSTEM", "Membersihkan cache sistem", { req });

    res.json({ message: "Cache sistem berhasil dibersihkan" });
  } catch (err) {
    res.status(500).json({ message: "Gagal membersihkan cache", error: err.message });
  }
};
