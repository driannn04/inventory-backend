const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { logActivity } = require("../utils/activityLogger");

// Registrasi Mandiri dihapus untuk keamanan sistem internal. 
// User hanya bisa dibuat oleh Admin melalui menu Manajemen User.

exports.login = (req, res) => {
  const { nup, password } = req.body;

  const sql = `
    SELECT u.*, r.nama_role, r.permissions,
           j.nama_jabatan,
           d.nama_dept,
           sd.nama_sub
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN jabatans j ON u.jabatan_id = j.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE u.nup = ?
  `;

  db.query(sql, [nup], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const user = result[0];
    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.nama_role,
        id_dept: user.id_dept,
        id_subdept: user.id_subdept
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    // 🔥 CATAT LOG LOGIN (Sekarang dengan IP & Device info)
    logActivity(user.id, "LOGIN", "SISTEM", "User berhasil masuk ke dalam sistem", { req });

    let permissions = [];
    try {
      permissions = user.permissions ? JSON.parse(user.permissions) : [];
    } catch (e) {
      permissions = [];
    }

    res.json({
      message: "Login berhasil",
      token: token,
      user: {
        id: user.id,
        nama: user.nama,
        nup: user.nup,
        role: user.nama_role,
        permissions: permissions,
        jabatan: user.nama_jabatan,
        departemen: user.nama_dept,
        sub_departemen: user.nama_sub,
        id_dept: user.id_dept,
        id_subdept: user.id_subdept
      }
    });
  });
};

exports.checkNup = (req, res) => {
  const { nup } = req.params;
  const sql = `
    SELECT u.nama, r.nama_role as role, d.nama_dept as departemen, sd.nama_sub as sub_departemen
    FROM users u
    JOIN roles r ON u.role_id = r.id 
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE u.nup = ?
  `;
  db.query(sql, [nup], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) {
      return res.status(404).json({ message: "NUP tidak ditemukan" });
    }
    res.json({
      nama: result[0].nama,
      role: result[0].role,
      departemen: result[0].departemen,
      sub_departemen: result[0].sub_departemen
    });
  });
};

exports.saveFcmToken = (req, res) => {
  const { token, device_type } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({ message: "Token FCM harus disertakan" });
  }

  const sql = `
    INSERT INTO user_fcm_tokens (user_id, token, device_type) 
    VALUES (?, ?, ?) 
    ON DUPLICATE KEY UPDATE device_type = VALUES(device_type), updated_at = NOW()
  `;

  db.query(sql, [userId, token, device_type || 'android'], (err) => {
    if (err) {
      console.error("Error saving FCM token:", err);
      return res.status(500).json({ message: "Gagal menyimpan token FCM", error: err.message });
    }
    res.json({ message: "Token FCM berhasil disimpan" });
  });
};

exports.deleteFcmToken = (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) {
    return res.status(400).json({ message: "Token FCM harus disertakan" });
  }

  const sql = `DELETE FROM user_fcm_tokens WHERE user_id = ? AND token = ?`;

  db.query(sql, [userId, token], (err, result) => {
    if (err) {
      console.error("Error deleting FCM token:", err);
      return res.status(500).json({ message: "Gagal menghapus token FCM", error: err.message });
    }
    res.json({ message: "Token FCM berhasil dihapus", affectedRows: result.affectedRows });
  });
};