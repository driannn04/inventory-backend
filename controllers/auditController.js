const db = require("../config/db");
const excel = require("exceljs");
const { styleExcelSheet } = require("../utils/excelHelper");
const { logActivity } = require("../utils/activityLogger");

// 1. GET LOGS (List for UI)
exports.getLogs = (req, res) => {
  const sql = `
    SELECT al.*, u.nama as nama_user, r.nama_role as role
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    ORDER BY al.created_at DESC
    LIMIT 200
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 2. EXPORT LOGS TO EXCEL
exports.exportLogs = (req, res) => {
  const sql = `
    SELECT 
      al.id, 
      al.created_at as Waktu, 
      u.nama as Pengguna, 
      r.nama_role as Role, 
      al.ip_address as IP, 
      al.aksi as Aksi, 
      al.tipe_data as Modul, 
      al.keterangan as Keterangan
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    ORDER BY al.created_at DESC
  `;

  db.query(sql, async (err, result) => {
    if (err) return res.status(500).json(err);

    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Activity Logs");
    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Waktu", key: "waktu", width: 22 },
      { header: "Pengguna", key: "pengguna", width: 25 },
      { header: "Role", key: "role", width: 15 },
      { header: "IP Address", key: "ip", width: 15 },
      { header: "Modul", key: "modul", width: 15 },
      { header: "Aksi", key: "aksi", width: 12 },
      { header: "Keterangan", key: "keterangan", width: 45 }
    ];

    result.forEach((r, i) => {
      sheet.addRow({
        no: i + 1,
        waktu: new Date(r.Waktu).toLocaleString("id-ID"),
        pengguna: r.Pengguna,
        role: r.Role,
        ip: r.IP,
        modul: r.Modul,
        aksi: r.Aksi,
        keterangan: r.Keterangan
      });
    });

    styleExcelSheet(sheet, "LAPORAN LOG AKTIVITAS SISTEM", "Semua Waktu", 8);

    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Audit_Log_Inventory_${timestamp}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

    // 🔥 LOG EXPORT
    logActivity(req.user.id, "EXPORT", "AUDIT LOG", `Mengekspor audit log ke Excel`, { req });
  });
};

// 3. LOG LOGIN (Legacy/Backup)
exports.logLogin = (req, res) => {
  const { user_id } = req.body;
  logActivity(user_id, "LOGIN", "SISTEM", "User berhasil masuk ke sistem", { req });
  res.json({ message: "Login logged" });
};

