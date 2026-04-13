const db = require("../config/db");
const bcrypt = require("bcryptjs");

// =============================
// 1. GET ALL USERS
// =============================
exports.getUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.nama, u.email, u.no_telp, u.jabatan, u.departemen, u.avatar, u.created_at,
           r.nama_role as role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// 2. GET USER BY ID
// =============================
exports.getUserById = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT u.id, u.nama, u.email, u.no_telp, u.jabatan, u.departemen, u.avatar, u.role_id, u.created_at,
           r.nama_role as role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json(result[0]);
  });
};

// =============================
// 3. CREATE USER
// =============================
exports.createUser = (req, res) => {
  const { nama, email, password, role_id, no_telp, jabatan, departemen } = req.body;

  if (!nama || !email || !password || !role_id) {
    return res.status(400).json({ message: "Nama, email, password, dan role wajib diisi" });
  }

  // Cek duplikat email
  db.query("SELECT id FROM users WHERE email = ?", [email], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    const sql = `
      INSERT INTO users (nama, email, password, role_id, no_telp, jabatan, departemen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nama, email, hashedPassword, role_id, no_telp || null, jabatan || null, departemen || null], (err2, result) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "User berhasil ditambahkan", id: result.insertId });
    });
  });
};

// =============================
// 4. UPDATE USER
// =============================
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { nama, email, role_id, no_telp, jabatan, departemen } = req.body;

  if (!nama || !email || !role_id) {
    return res.status(400).json({ message: "Nama, email, dan role wajib diisi" });
  }

  // Cek duplikat email (kecuali user ini sendiri)
  db.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, id], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email sudah digunakan user lain" });
    }

    const sql = `
      UPDATE users SET nama=?, email=?, role_id=?, no_telp=?, jabatan=?, departemen=?
      WHERE id=?
    `;

    db.query(sql, [nama, email, role_id, no_telp || null, jabatan || null, departemen || null, id], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "User berhasil diupdate" });
    });
  });
};

// =============================
// 5. DELETE USER (HARD DELETE)
// =============================
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  // Proteksi: Tidak bisa hapus diri sendiri
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: "Tidak bisa menghapus akun sendiri" });
  }

  // Cek apakah user memiliki pengajuan aktif
  db.query("SELECT COUNT(*) as total FROM pengajuan WHERE user_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result[0].total > 0) {
      return res.status(400).json({
        message: "User tidak bisa dihapus karena memiliki riwayat pengajuan. Hubungi database admin."
      });
    }

    db.query("DELETE FROM users WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "User berhasil dihapus" });
    });
  });
};

// =============================
// 6. RESET PASSWORD
// =============================
exports.resetPassword = (req, res) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ message: "Password minimal 6 karakter" });
  }

  const hashedPassword = bcrypt.hashSync(new_password, 8);

  db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Password berhasil direset" });
  });
};

// =============================
// 7. GET ALL ROLES (untuk dropdown)
// =============================
exports.getRoles = (req, res) => {
  db.query("SELECT * FROM roles ORDER BY id", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// 8. GET PROFIL SAYA
// =============================
exports.getMyProfile = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT u.id, u.nama, u.email, u.no_telp, u.jabatan, u.departemen, u.avatar, u.created_at,
           r.nama_role as role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json(result[0]);
  });
};

// =============================
// 9. UPDATE PROFIL SAYA
// =============================
exports.updateMyProfile = (req, res) => {
  const userId = req.user.id;
  const { nama, no_telp, jabatan, departemen } = req.body;

  const sql = `
    UPDATE users SET nama=?, no_telp=?, jabatan=?, departemen=?
    WHERE id=?
  `;

  db.query(sql, [nama, no_telp || null, jabatan || null, departemen || null, userId], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Profil berhasil diupdate" });
  });
};

// =============================
// 10. GANTI PASSWORD SAYA
// =============================
exports.changeMyPassword = (req, res) => {
  const userId = req.user.id;
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ message: "Password lama dan baru wajib diisi" });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: "Password baru minimal 6 karakter" });
  }

  db.query("SELECT password FROM users WHERE id = ?", [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    const valid = bcrypt.compareSync(old_password, result[0].password);
    if (!valid) {
      return res.status(401).json({ message: "Password lama salah" });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 8);

    db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "Password berhasil diubah" });
    });
  });
};
