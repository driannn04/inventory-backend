const db = require("../config/db");
const { kirimNotifikasi, kirimNotifikasiByRole } = require("../utils/notifikasi");
const { logActivity } = require("../utils/activityLogger");

// =============================
exports.createPengajuan = (req, res) => {
  const { user_id, items, catatan, role, urgensi } = req.body;

  let status = "pending_assessment";
  if (role === "manager") status = "pending_gudang";

  const nomor = "PGJ-" + Date.now();

  const sqlPengajuan = `
    INSERT INTO pengajuan (nomor_pengajuan, user_id, status, urgensi, tanggal_pengajuan, catatan)
    VALUES (?, ?, ?, ?, CURDATE(), ?)
  `;

  db.beginTransaction(async (err) => {
    if (err) return res.status(500).json(err);

    try {
      // 1. VALIDASI STOK STRICT (FOR UPDATE Lock)
      for (const item of items) {
        await new Promise((resolve, reject) => {
          const sqlCek = `
            SELECT b.nama_barang, b.stok,
            (b.stok - IFNULL((
                SELECT SUM(pd.jumlah) 
                FROM pengajuan_detail pd
                JOIN pengajuan peng ON pd.pengajuan_id = peng.id
                WHERE pd.barang_id = b.id 
                AND peng.status IN ('pending_assessment', 'pending_manager', 'pending_gudang')
            ), 0)) as stok_tersedia
            FROM barang b
            WHERE b.id = ? 
            FOR UPDATE
          `;
          db.query(sqlCek, [item.barang_id], (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0) return reject(new Error("Barang tidak ditemukan dalam sistem"));
            
            const stokTersedia = rows[0].stok_tersedia;
            if (item.jumlah > stokTersedia) {
              return reject(new Error(`Stok "${rows[0].nama_barang}" HABIS keduluan diorder! Sisa tersedia: ${stokTersedia}`));
            }
            resolve();
          });
        });
      }

      // 2. INSERT PENGAJUAN SETELAH VALIDASI BERHASIL
      db.query(sqlPengajuan, [nomor, user_id, status, urgensi || 'normal', catatan], (err, result) => {
        if (err) return db.rollback(() => res.status(500).json(err));

        const pengajuan_id = result.insertId;
        const sqlDetail = `INSERT INTO pengajuan_detail (pengajuan_id, barang_id, jumlah) VALUES (?, ?, ?)`;

        const insertItems = async () => {
          for (const item of items) {
            await new Promise((resolve, reject) => {
              db.query(sqlDetail, [pengajuan_id, item.barang_id, item.jumlah], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        };

        insertItems()
          .then(() => {
            db.commit((err) => {
              if (err) return db.rollback(() => res.status(500).json(err));

              logActivity(user_id, "TAMBAH", "PENGAJUAN", `Membuat pengajuan baru: ${nomor}`);
              kirimNotifikasi(user_id, "Pengajuan Dibuat", `Pengajuan ${nomor} berhasil dibuat`);
              kirimNotifikasiByRole("asesmen", "Pengajuan Baru", `Pengajuan ${nomor} menunggu approval`);

              res.json({ message: "Pengajuan berhasil dirilis dalam antrian", nomor_pengajuan: nomor });
            });
          })
          .catch((err) => db.rollback(() => res.status(500).json(err)));
      });

    } catch (error) {
      db.rollback(() => {
        res.status(400).json({ message: error.message });
      });
    }
  });
};

// =============================
// GET SEMUA PENGAJUAN (filter by role)
// =============================
exports.getPengajuan = (req, res) => {

  // role & user_id diambil dari token (req.user diset oleh middleware)
  const { role, id: user_id } = req.user;

  let sql = "";
  let params = [];

  if (role === "staff") {
    // staff hanya lihat pengajuan miliknya sendiri
    sql = `
      SELECT pengajuan.*, users.nama
      FROM pengajuan
      JOIN users ON pengajuan.user_id = users.id
      WHERE pengajuan.user_id = ?
      ORDER BY pengajuan.created_at DESC
    `;
    params = [user_id];

  } else if (role === "asesmen") {
    // asesmen lihat yang perlu di-review (pending_assessment)
    sql = `
      SELECT pengajuan.*, users.nama
      FROM pengajuan
      JOIN users ON pengajuan.user_id = users.id
      WHERE pengajuan.status = 'pending_assessment'
      ORDER BY pengajuan.created_at DESC
    `;

  } else if (role === "manager") {
    // manager lihat yang sudah dari asesmen
    sql = `
      SELECT pengajuan.*, users.nama
      FROM pengajuan
      JOIN users ON pengajuan.user_id = users.id
      WHERE pengajuan.status IN ('pending_manager','pending_gudang','completed','rejected')
      ORDER BY pengajuan.created_at DESC
    `;

  } else if (role === "gudang") {
    // gudang lihat yang siap diproses
    sql = `
      SELECT pengajuan.*, users.nama
      FROM pengajuan
      JOIN users ON pengajuan.user_id = users.id
      WHERE pengajuan.status = 'pending_gudang'
      ORDER BY pengajuan.created_at DESC
    `;

  } else {
    // admin lihat semua
    sql = `
      SELECT pengajuan.*, users.nama
      FROM pengajuan
      JOIN users ON pengajuan.user_id = users.id
      ORDER BY 
        CASE 
          WHEN pengajuan.urgensi = 'darurat' THEN 1 
          WHEN pengajuan.urgensi = 'penting' THEN 2 
          ELSE 3 
        END,
        pengajuan.created_at DESC
    `;
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });

};

// =============================
exports.getPengajuanById = (req, res) => {

  const id = req.params.id;

  const sql = `
    SELECT p.id, p.nomor_pengajuan, p.status, p.catatan, p.tanggal_pengajuan, p.urgensi,
    b.nama_barang, b.satuan, b.lokasi_rak, b.stok,
    (b.stok - IFNULL((
        SELECT SUM(pd.jumlah) 
        FROM pengajuan_detail pd
        JOIN pengajuan peng ON pd.pengajuan_id = peng.id
        WHERE pd.barang_id = b.id 
        AND peng.status IN ('pending_assessment', 'pending_manager', 'pending_gudang')
    ), 0)) as stok_tersedia,
    d.jumlah
    FROM pengajuan p
    JOIN pengajuan_detail d ON p.id = d.pengajuan_id
    JOIN barang b ON d.barang_id = b.id
    WHERE p.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });

};

// =============================
// FIX: approvePengajuan — semua db.query pakai callback
// FIX: res.json() dipanggil di dalam callback, bukan di luar
// =============================
exports.approvePengajuan = (req, res) => {

  const { pengajuan_id, role, user_id } = req.body;

  if (role === "asesmen") {
    db.beginTransaction((err) => {
      if (err) return res.status(500).json(err);

      // 1. Lock & Cek Status
      db.query("SELECT status FROM pengajuan WHERE id = ? FOR UPDATE", [pengajuan_id], (err, rows) => {
        if (err) return db.rollback(() => res.status(500).json(err));
        if (rows.length === 0) return db.rollback(() => res.status(404).json({ message: "Pengajuan tidak ditemukan" }));
        
        const currentStatus = rows[0].status;
        if (currentStatus !== 'pending_assessment') {
          return db.rollback(() => res.status(400).json({ message: `Status pengajuan sudah berubah (${currentStatus})` }));
        }

        // 2. Update Status
        const sqlShift = "UPDATE pengajuan SET status='pending_manager' WHERE id=?";
        db.query(sqlShift, [pengajuan_id], (err) => {
          if (err) return db.rollback(() => res.status(500).json(err));

          // 3. Log Approval
          const sqlLog = `
            INSERT INTO approval (pengajuan_id, approved_by, role, status, tanggal)
            VALUES (?, ?, ?, 'approved', NOW())
          `;
          db.query(sqlLog, [pengajuan_id, user_id, role], (err) => {
            if (err) return db.rollback(() => res.status(500).json(err));

            db.commit((err) => {
              if (err) return db.rollback(() => res.status(500).json(err));

              logActivity(user_id, "APPROVE", "PENGAJUAN", `Approval Asesmen untuk Pengajuan ID ${pengajuan_id}`);
              kirimNotifikasiByRole("manager", "Butuh Approval Manager", `Pengajuan ID ${pengajuan_id}`);
              res.json({ message: "Approval Asesmen berhasil" });
            });
          });
        });
      });
    });

  } else if (role === "manager") {
    db.beginTransaction((err) => {
      if (err) return res.status(500).json(err);

      // 1. Lock & Cek Status
      db.query("SELECT status FROM pengajuan WHERE id = ? FOR UPDATE", [pengajuan_id], (err, rows) => {
        if (err) return db.rollback(() => res.status(500).json(err));
        if (rows.length === 0) return db.rollback(() => res.status(404).json({ message: "Pengajuan tidak ditemukan" }));

        const currentStatus = rows[0].status;
        if (currentStatus !== 'pending_manager') {
          return db.rollback(() => res.status(400).json({ message: `Status pengajuan sudah berubah (${currentStatus})` }));
        }

        // 2. Update Status
        const sqlShift = "UPDATE pengajuan SET status='pending_gudang' WHERE id=?";
        db.query(sqlShift, [pengajuan_id], (err) => {
          if (err) return db.rollback(() => res.status(500).json(err));

          // 3. Log Approval
          const sqlLog = `
            INSERT INTO approval (pengajuan_id, approved_by, role, status, tanggal)
            VALUES (?, ?, ?, 'approved', NOW())
          `;
          db.query(sqlLog, [pengajuan_id, user_id, role], (err) => {
            if (err) return db.rollback(() => res.status(500).json(err));

            db.commit((err) => {
              if (err) return db.rollback(() => res.status(500).json(err));

              logActivity(user_id, "APPROVE", "PENGAJUAN", `Approval Manager untuk Pengajuan ID ${pengajuan_id}`);
              kirimNotifikasiByRole("gudang", "Siap Diproses Gudang", `Pengajuan ID ${pengajuan_id}`);
              res.json({ message: "Approval Manager berhasil" });
            });
          });
        });
      });
    });

  } else if (role === "gudang") {

    // ✅ Ambil detail barang + nomor pengajuan sekaligus
    const sqlDetail = `
      SELECT pd.barang_id, pd.jumlah, p.nomor_pengajuan
      FROM pengajuan_detail pd
      JOIN pengajuan p ON p.id = pd.pengajuan_id
      WHERE pd.pengajuan_id = ?
    `;

    db.query(sqlDetail, [pengajuan_id], (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.status(404).json({ message: "Detail pengajuan tidak ditemukan" });
      }

      const nomorPengajuan = result[0].nomor_pengajuan;

      // =============================================
      // STEP 1: Mulai TRANS AKSI AMAN (SQL Transaction)
      // =============================================
      db.beginTransaction((err) => {
        if (err) return res.status(500).json(err);

        // 1. Lock & Cek Status Pengajuan (Gudang)
        db.query("SELECT status FROM pengajuan WHERE id = ? FOR UPDATE", [pengajuan_id], (err, rows) => {
          if (err) return db.rollback(() => res.status(500).json(err));
          if (rows.length === 0) return db.rollback(() => res.status(404).json({ message: "Pengajuan tidak ditemukan" }));

          const currentStatus = rows[0].status;
          if (currentStatus !== 'pending_gudang') {
            return db.rollback(() => res.status(400).json({ message: `Status pengajuan sudah berubah (${currentStatus})` }));
          }

          // Fungsi helper untuk memproses item satu per satu dalam transaksi
          const prosesItems = async () => {
            for (const item of result) {
              // 1. Ambil stok terbaru + KUNCI BARIS (FOR UPDATE)
              const [rows] = await new Promise((resolve, reject) => {
                db.query(
                  "SELECT stok, nama_barang FROM barang WHERE id = ? FOR UPDATE",
                  [item.barang_id],
                  (err, r) => err ? reject(err) : resolve([r])
                );
              });

              if (rows.length === 0) throw new Error(`Barang ID ${item.barang_id} tidak ditemukan`);
              const b = rows[0];

              // 2. Validasi Stok
              if (b.stok < item.jumlah) {
                throw new Error(`Stok "${b.nama_barang}" tidak cukup. Sisa: ${b.stok}, Butuh: ${item.jumlah}`);
              }

              // 3. Kurangi Stok
              await new Promise((resolve, reject) => {
                db.query(
                  "UPDATE barang SET stok = stok - ? WHERE id = ?",
                  [item.jumlah, item.barang_id],
                  (err) => err ? reject(err) : resolve()
                );
              });

              // 4. Catat Mutasi Keluar
              await new Promise((resolve, reject) => {
                const sqlStokKeluar = `
                  INSERT INTO stok_keluar (barang_id, pengajuan_id, jumlah, tanggal, keterangan)
                  VALUES (?, ?, ?, CURDATE(), ?)
                `;
                const keterangan = `Dari Pengajuan: ${nomorPengajuan}`;
                db.query(
                  sqlStokKeluar,
                  [item.barang_id, pengajuan_id, item.jumlah, keterangan],
                  (err) => err ? reject(err) : resolve()
                );
              });
            }
          };

          prosesItems()
            .then(() => {
              // STEP 5: Semua item sukses -> Update Status Pengajuan
              const sqlStatus = "UPDATE pengajuan SET status='completed' WHERE id=?";
              db.query(sqlStatus, [pengajuan_id], (err) => {
                if (err) throw err;

                // STEP 6: Catat Log Approval
                db.query(
                  `INSERT INTO approval (pengajuan_id, approved_by, role, status, tanggal) VALUES (?, ?, ?, 'approved', NOW())`,
                  [pengajuan_id, user_id, role]
                );

                // STEP 7: COMMIT (Simpan Permanen)
                db.commit((err) => {
                  if (err) throw err;

                  // Notif & Response (Diluar transaksi)
                  kirimNotifikasiByRole("admin", "✅ Pengajuan Selesai", `${nomorPengajuan} selesai diproses gudang`);
                  res.json({ message: "Pengajuan berhasil diproses gudang. Stok telah dikurangi secara aman." });
                });
              });
            })
            .catch((err) => {
              // GAGAL -> ROLLBACK (Batalkan semua perubahan)
              db.rollback(() => {
                console.error("❌ Transaksi Gagal, Rollback dilakukan:", err.message);
                res.status(400).json({ message: err.message || "Gagal memproses pengajuan" });
              });
            });
        });
      });

    });

  } else {
    res.status(400).json({ message: "Role tidak dikenali" });
  }

};

// =============================
exports.rejectPengajuan = (req, res) => {
  const { pengajuan_id, role, user_id, catatan } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json(err);

    // 1. Lock & Cek Status
    db.query("SELECT status FROM pengajuan WHERE id = ? FOR UPDATE", [pengajuan_id], (err, rows) => {
      if (err) return db.rollback(() => res.status(500).json(err));
      if (rows.length === 0) return db.rollback(() => res.status(404).json({ message: "Pengajuan tidak ditemukan" }));

      const currentStatus = rows[0].status;
      if (currentStatus === 'completed' || currentStatus === 'rejected') {
        return db.rollback(() => res.status(400).json({ message: "Pengajuan sudah diproses atau ditolak sebelumnya" }));
      }

      // 2. Update Status
      const sql = "UPDATE pengajuan SET status='rejected' WHERE id=?";
      db.query(sql, [pengajuan_id], (err) => {
        if (err) return db.rollback(() => res.status(500).json(err));

        // 3. Log History
        const sqlLog = `
          INSERT INTO approval (pengajuan_id,approved_by,role,status,catatan,tanggal)
          VALUES (?,?,?,'rejected',?,NOW())
        `;
        db.query(sqlLog, [pengajuan_id, user_id, role, catatan], (err) => {
          if (err) return db.rollback(() => res.status(500).json(err));

          db.commit((err) => {
            if (err) return db.rollback(() => res.status(500).json(err));

            // Notifikasi (Diluar transaksi)
            db.query("SELECT user_id FROM pengajuan WHERE id=?", [pengajuan_id], (err, pResult) => {
              if (!err && pResult.length > 0) {
                kirimNotifikasi(pResult[0].user_id, "Pengajuan Ditolak", `Pengajuan Anda ditolak oleh ${role}`);
              }
            });

            res.json({ message: "Pengajuan berhasil ditolak" });
          });
        });
      });
    });
  });
};

// =============================
exports.getApprovalHistory = (req, res) => {

  const id = req.params.id;

  const sql = `
    SELECT a.*, u.nama
    FROM approval a
    JOIN users u ON a.approved_by = u.id
    WHERE a.pengajuan_id = ?
    ORDER BY a.tanggal ASC
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });

};