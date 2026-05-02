const db = require("../config/db");
const { kirimNotifikasi, kirimNotifikasiByRole } = require("../utils/notifikasi");
const { logActivity } = require("../utils/activityLogger");

// =============================
// CREATE PENGAJUAN
// =============================
exports.createPengajuan = (req, res) => {
  const { user_id, items, catatan, role, urgensi } = req.body;

  let status = "pending_asisten_manager";
  if (role === "asisten_manager") status = "pending_manager";
  if (role === "manager") status = "pending_gudang";

  const nomor = "PGJ-" + Date.now();

  const sqlPengajuan = `
    INSERT INTO pengajuan (nomor_pengajuan, user_id, status, urgensi, tanggal_pengajuan, catatan)
    VALUES (?, ?, ?, ?, NOW(), ?)
  `;

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);

    conn.beginTransaction(async (err) => {
      if (err) { conn.release(); return res.status(500).json(err); }

      try {
        // 1. VALIDASI STOK STRICT
        for (const item of items) {
          await new Promise((resolve, reject) => {
            const sqlCek = `
              SELECT b.nama_barang, b.stok,
              (b.stok - IFNULL((
                  SELECT SUM(pd.jumlah) 
                  FROM pengajuan_detail pd
                  JOIN pengajuan peng ON pd.pengajuan_id = peng.id
                  WHERE pd.barang_id = b.id 
                  AND peng.status IN ('pending_asisten_manager', 'pending_manager', 'pending_gudang')
              ), 0)) as stok_tersedia
              FROM barang b
              WHERE b.id = ? 
              FOR UPDATE
            `;
            conn.query(sqlCek, [item.barang_id], (err, rows) => {
              if (err) return reject(err);
              if (rows.length === 0) return reject(new Error("Barang tidak ditemukan"));
              const available = rows[0].stok_tersedia;
              if (item.jumlah > available) return reject(new Error(`Stok "${rows[0].nama_barang}" tidak cukup!`));
              resolve();
            });
          });
        }

        // 2. INSERT PENGAJUAN
        conn.query(sqlPengajuan, [nomor, user_id, status, urgensi || 'normal', catatan], (err, result) => {
          if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });

          const pengajuan_id = result.insertId;
          const sqlDetail = `INSERT INTO pengajuan_detail (pengajuan_id, barang_id, jumlah) VALUES (?, ?, ?)`;

          const insertItems = async () => {
            for (const item of items) {
              await new Promise((resolve, reject) => {
                conn.query(sqlDetail, [pengajuan_id, item.barang_id, item.jumlah], (err) => {
                  if (err) reject(err); else resolve();
                });
              });
            }
          };

          insertItems()
            .then(() => {
              conn.commit((err) => {
                if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
                conn.release();
                
                logActivity(user_id, "TAMBAH", "PENGAJUAN", `Membuat pengajuan baru: ${nomor}`);
                kirimNotifikasi(user_id, "Pengajuan Dibuat", `Pengajuan ${nomor} berhasil dibuat`);
                
                if (role === "manager") kirimNotifikasiByRole("gudang", "📦 Pengajuan Manager", `Pengajuan ${nomor} menunggu gudang`);
                else if (role === "asisten_manager") kirimNotifikasiByRole("manager", "📑 Pengajuan Asmen", `Pengajuan ${nomor} menunggu manager`);
                else kirimNotifikasiByRole("asisten_manager", "Pengajuan Baru", `Pengajuan ${nomor} menunggu approval`);

                res.json({ message: "Pengajuan berhasil dikirim", nomor_pengajuan: nomor });
              });
            })
            .catch((err) => conn.rollback(() => { conn.release(); res.status(400).json({ message: err.message }); }));
        });
      } catch (error) {
        conn.rollback(() => { conn.release(); res.status(400).json({ message: error.message }); });
      }
    });
  });
};

// =============================
// GET PENGAJUAN
// =============================
exports.getPengajuan = (req, res) => {
  const { role, id: user_id } = req.user;
  let sql = "";
  let params = [];

  if (role === "staff") {
    sql = `SELECT p.*, u.nama, r.nama_role as pengaju_role FROM pengajuan p JOIN users u ON p.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE p.user_id = ? ORDER BY p.created_at DESC`;
    params = [user_id];
  } else if (role === "asisten_manager") {
    sql = `SELECT p.*, u.nama, r.nama_role as pengaju_role FROM pengajuan p JOIN users u ON p.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE p.status IN ('pending_asisten_manager','pending_manager','pending_gudang','completed','rejected') ORDER BY p.created_at DESC`;
  } else if (role === "manager") {
    sql = `SELECT p.*, u.nama, r.nama_role as pengaju_role FROM pengajuan p JOIN users u ON p.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE p.status IN ('pending_manager','pending_gudang','completed','rejected') ORDER BY p.created_at DESC`;
  } else if (role === "gudang") {
    sql = `SELECT p.*, u.nama, r.nama_role as pengaju_role FROM pengajuan p JOIN users u ON p.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE p.status IN ('pending_gudang','completed','rejected') ORDER BY p.created_at DESC`;
  } else {
    sql = `SELECT p.*, u.nama, r.nama_role as pengaju_role FROM pengajuan p JOIN users u ON p.user_id = u.id JOIN roles r ON u.role_id = r.id ORDER BY p.created_at DESC`;
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// STAFF STATS
// =============================
exports.getStaffStats = (req, res) => {
  const user_id = req.user.id;
  const sql = `
    SELECT COUNT(*) as total,
    SUM(CASE WHEN status IN ('pending_asisten_manager','pending_manager','pending_gudang') THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM pengajuan WHERE user_id = ?
  `;
  db.query(sql, [user_id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};

// =============================
// GET BY ID
// =============================
exports.getPengajuanById = (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT p.*, u.nama, r.nama_role as pengaju_role,
    b.id as barang_id, b.nama_barang, b.kode_barang, b.satuan, b.lokasi_rak, b.stok, b.foto,
    (b.stok - IFNULL((SELECT SUM(pd2.jumlah) FROM pengajuan_detail pd2 JOIN pengajuan peng2 ON pd2.pengajuan_id = peng2.id WHERE pd2.barang_id = b.id AND peng2.status IN ('pending_asisten_manager','pending_manager','pending_gudang')), 0)) as stok_tersedia,
    d.jumlah
    FROM pengajuan p
    JOIN pengajuan_detail d ON p.id = d.pengajuan_id
    JOIN barang b ON d.barang_id = b.id
    JOIN users u ON p.user_id = u.id
    JOIN roles r ON u.role_id = r.id
    WHERE p.id = ?
  `;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// APPROVE PENGAJUAN (Unified)
// =============================
exports.approvePengajuan = (req, res) => {
  const { pengajuan_id, role, user_id } = req.body;
  
  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);

    conn.beginTransaction((err) => {
      if (err) { conn.release(); return res.status(500).json(err); }

      conn.query("SELECT status, nomor_pengajuan, user_id FROM pengajuan WHERE id = ? FOR UPDATE", [pengajuan_id], (err, rows) => {
        if (err || rows.length === 0) return conn.rollback(() => { conn.release(); res.status(404).json({ message: "Not found" }); });
        
        const p = rows[0];
        let nextStatus = "";
        if (role === "asisten_manager") nextStatus = "pending_manager";
        else if (role === "manager") nextStatus = "pending_gudang";
        else if (role === "gudang") nextStatus = "completed";

        if (role === "gudang") {
          // Logic stok jika Gudang approve
          conn.query("SELECT pd.barang_id, pd.jumlah, b.nama_barang, b.stok FROM pengajuan_detail pd JOIN barang b ON pd.barang_id = b.id WHERE pd.pengajuan_id = ?", [pengajuan_id], async (err, items) => {
            if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
            
            try {
              for (const item of items) {
                if (item.stok < item.jumlah) throw new Error(`Stok ${item.nama_barang} tidak cukup!`);
                await new Promise((rs, rj) => conn.query("UPDATE barang SET stok = stok - ? WHERE id = ?", [item.jumlah, item.barang_id], (e) => e ? rj(e) : rs()));
                await new Promise((rs, rj) => conn.query("INSERT INTO stok_keluar (barang_id, pengajuan_id, jumlah, tanggal, keterangan) VALUES (?,?,?,NOW(),?)", [item.barang_id, pengajuan_id, item.jumlah, `Pengajuan: ${p.nomor_pengajuan}`], (e) => e ? rj(e) : rs()));
              }
              finishApproval(conn, pengajuan_id, user_id, role, nextStatus, p, res);
            } catch (e) {
              conn.rollback(() => { conn.release(); res.status(400).json({ message: e.message }); });
            }
          });
        } else {
          finishApproval(conn, pengajuan_id, user_id, role, nextStatus, p, res);
        }
      });
    });
  });
};

function finishApproval(conn, pengajuan_id, user_id, role, nextStatus, p, res) {
  conn.query("UPDATE pengajuan SET status=? WHERE id=?", [nextStatus, pengajuan_id], (err) => {
    if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
    conn.query("INSERT INTO approval (pengajuan_id, approved_by, role, status, tanggal) VALUES (?,?,?, 'approved', NOW())", [pengajuan_id, user_id, role], (err) => {
      if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
      conn.commit((err) => {
        if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
        conn.release();
        logActivity(user_id, "APPROVE", "PENGAJUAN", `Approval ${role} untuk ${p.nomor_pengajuan}`);
        kirimNotifikasi(p.user_id, "Update Pengajuan", `Pengajuan ${p.nomor_pengajuan} disetujui oleh ${role}`);
        if (role === "asisten_manager") kirimNotifikasiByRole("manager", "Approval Baru", `Menunggu Manager: ${p.nomor_pengajuan}`);
        if (role === "manager") kirimNotifikasiByRole("gudang", "Siap Diproses", `Menunggu Gudang: ${p.nomor_pengajuan}`);
        res.json({ message: `Approval ${role} berhasil` });
      });
    });
  });
}

// =============================
// REJECT PENGAJUAN
// =============================
exports.rejectPengajuan = (req, res) => {
  const { pengajuan_id, role, user_id, catatan } = req.body;
  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);
    conn.beginTransaction((err) => {
      if (err) { conn.release(); return res.status(500).json(err); }
      conn.query("UPDATE pengajuan SET status='rejected' WHERE id=?", [pengajuan_id], (err) => {
        if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
        conn.query("INSERT INTO approval (pengajuan_id, approved_by, role, status, catatan, tanggal) VALUES (?,?,?,'rejected',?,NOW())", [pengajuan_id, user_id, role, catatan], (err) => {
          if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
          conn.commit((err) => {
            if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
            conn.release();
            res.json({ message: "Pengajuan ditolak" });
          });
        });
      });
    });
  });
};

// =============================
// HISTORY & CRUD
// =============================
exports.getApprovalHistory = (req, res) => {
  db.query("SELECT a.*, u.nama FROM approval a JOIN users u ON a.approved_by = u.id WHERE a.pengajuan_id = ? ORDER BY a.tanggal ASC", [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.deletePengajuan = (req, res) => {
  const id = req.params.id;
  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);
    conn.beginTransaction(async (err) => {
      if (err) { conn.release(); return res.status(500).json(err); }
      try {
        await new Promise((rs,rj) => conn.query("DELETE FROM pengajuan_detail WHERE pengajuan_id=?", [id], (e) => e?rj(e):rs()));
        await new Promise((rs,rj) => conn.query("DELETE FROM pengajuan WHERE id=?", [id], (e) => e?rj(e):rs()));
        conn.commit((err) => {
          if (err) throw err;
          conn.release();
          res.json({ message: "Berhasil dihapus" });
        });
      } catch (e) { conn.rollback(() => { conn.release(); res.status(500).json(e); }); }
    });
  });
};

exports.updatePengajuan = (req, res) => {
  const id = req.params.id;
  const { items, catatan, urgensi } = req.body;
  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);
    conn.beginTransaction(async (err) => {
      if (err) { conn.release(); return res.status(500).json(err); }
      try {
        await new Promise((rs,rj) => conn.query("UPDATE pengajuan SET catatan=?, urgensi=? WHERE id=?", [catatan, urgensi, id], (e)=>e?rj(e):rs()));
        await new Promise((rs,rj) => conn.query("DELETE FROM pengajuan_detail WHERE pengajuan_id=?", [id], (e)=>e?rj(e):rs()));
        for (const item of items) {
          await new Promise((rs,rj) => conn.query("INSERT INTO pengajuan_detail (pengajuan_id, barang_id, jumlah) VALUES (?,?,?)", [id, item.barang_id, item.jumlah], (e)=>e?rj(e):rs()));
        }
        conn.commit((err) => {
          if (err) throw err;
          conn.release();
          res.json({ message: "Berhasil diupdate" });
        });
      } catch (e) { conn.rollback(() => { conn.release(); res.status(500).json(e); }); }
    });
  });
};