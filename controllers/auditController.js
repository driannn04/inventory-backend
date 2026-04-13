const db = require("../config/db");

exports.getLogs = (req, res) => {
  const sql = `
    SELECT al.*, u.nama as nama_user, r.nama_role as role
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    ORDER BY al.created_at DESC
    LIMIT 100
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.logLogin = (req, res) => {
  const { user_id } = req.body;
  const sql = "INSERT INTO activity_logs (user_id, aksi, tipe_data, keterangan) VALUES (?, 'Login', 'Sistem', 'User berhasil masuk ke sistem')";
  db.query(sql, [user_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Login logged" });
  });
};
