const db = require("../config/db");
const XLSX = require("xlsx");
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

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    // Format data untuk Excel
    const data = result.map(item => ({
      ...item,
      Waktu: new Date(item.Waktu).toLocaleString("id-ID")
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Audit_Log_Inventory.xlsx");
    res.send(buffer);

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

