const db = require("../config/db");
const bcrypt = require("bcryptjs");

// =============================
// 1. GET ALL USERS
// =============================
exports.getUsers = (req, res) => {
  const sql = `
    SELECT u.id, u.nup, u.nama, u.email, u.no_telp, u.avatar, u.created_at,
           u.jabatan_id, u.id_dept, u.id_subdept, u.role_id,
           r.nama_role as role,
           j.nama_jabatan as jabatan,
           d.nama_dept as departemen,
           sd.nama_sub as sub_departemen
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN jabatans j ON u.jabatan_id = j.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
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
    SELECT u.id, u.nup, u.nama, u.email, u.no_telp, u.avatar, u.created_at,
           u.jabatan_id, u.id_dept, u.id_subdept, u.role_id,
           r.nama_role as role,
           j.nama_jabatan as jabatan,
           d.nama_dept as departemen,
           sd.nama_sub as sub_departemen
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN jabatans j ON u.jabatan_id = j.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
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
  const { nup, nama, email, password, role_id, no_telp, jabatan_id, id_dept, id_subdept } = req.body;

  if (!nup || !nama || !role_id || !password) {
    return res.status(400).json({ message: "NUP, Nama, Password, dan Role wajib diisi" });
  }

  // Cek duplikat NUP
  db.query("SELECT id FROM users WHERE nup = ?", [nup], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) {
      return res.status(400).json({ message: "NUP sudah terdaftar" });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);

    const sql = `
      INSERT INTO users (nup, nama, email, password, role_id, no_telp, jabatan_id, id_dept, id_subdept)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [nup, nama, email || null, hashedPassword, role_id, no_telp || null, jabatan_id || null, id_dept || null, id_subdept || null], (err2, result) => {
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
  const { nup, nama, email, role_id, no_telp, jabatan_id, id_dept, id_subdept } = req.body;

  if (!nup || !nama || !role_id) {
    return res.status(400).json({ message: "NUP, Nama, dan Role wajib diisi" });
  }

  // Cek duplikat NUP (kecuali user ini sendiri)
  db.query("SELECT id FROM users WHERE nup = ? AND id != ?", [nup, id], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) {
      return res.status(400).json({ message: "NUP sudah digunakan user lain" });
    }

    const sql = `
      UPDATE users SET nup=?, nama=?, email=?, role_id=?, no_telp=?, jabatan_id=?, id_dept=?, id_subdept=?
      WHERE id=?
    `;

    db.query(sql, [nup, nama, email || null, role_id, no_telp || null, jabatan_id || null, id_dept || null, id_subdept || null, id], (err2) => {
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
    SELECT u.id, u.nup, u.nama, u.email, u.no_telp, u.avatar, u.created_at,
           u.jabatan_id, u.id_dept, u.id_subdept,
           r.nama_role as role,
           j.nama_jabatan as jabatan,
           d.nama_dept as departemen,
           sd.nama_sub as sub_departemen
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN jabatans j ON u.jabatan_id = j.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
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
  const { nama, no_telp } = req.body;

  const sql = `UPDATE users SET nama=?, no_telp=? WHERE id=?`;

  db.query(sql, [nama, no_telp || null, userId], (err) => {
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

// =============================
// 11. GET NEXT NUP SUGGESTION
// =============================
exports.getNextNup = (req, res) => {
  const sql = "SELECT nup FROM users WHERE nup REGEXP '^[0-9]+$' ORDER BY CAST(nup AS UNSIGNED) DESC LIMIT 1";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    
    let nextNup = "0001";
    if (result.length > 0) {
      const lastNup = parseInt(result[0].nup);
      nextNup = (lastNup + 1).toString().padStart(4, '0');
    }
    
    res.json({ nextNup });
  });
};

// =============================
// 12. MASTER DATA: JABATAN
// =============================
exports.getJabatans = (req, res) => {
  db.query("SELECT * FROM jabatans ORDER BY id", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// 13. MASTER DATA: DEPARTEMEN
// =============================
exports.getDepartments = (req, res) => {
  db.query("SELECT * FROM departments ORDER BY id", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// 14. MASTER DATA: SUB-DEPARTEMEN
// =============================
exports.getSubDepartments = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM sub_departments WHERE id_dept = ? ORDER BY id", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
