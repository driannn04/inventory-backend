const db = require("../config/db");
const { kirimNotifikasi, kirimNotifikasiByRole } = require("../utils/notifikasi");
const { logActivity } = require("../utils/activityLogger");

// =============================
// STOK MASUK
// =============================
exports.tambahStokMasuk = (req, res) => {
  let { barang_id, jumlah, keterangan } = req.body;
  barang_id = parseInt(barang_id);
  jumlah = parseInt(jumlah);

  if (!barang_id || !jumlah || jumlah <= 0) return res.status(400).json({ message: "Data tidak valid" });

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json(err);

    conn.beginTransaction((err) => {
      if (err) { conn.release(); return res.status(500).json(err); }

      conn.query("INSERT INTO stok_masuk (barang_id, jumlah, tanggal, keterangan) VALUES (?,?,NOW(),?)", [barang_id, jumlah, keterangan], (err) => {
        if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });

        conn.query("UPDATE barang SET stok = stok + ? WHERE id = ?", [jumlah, barang_id], (err, result) => {
          if (err || result.affectedRows === 0) return conn.rollback(() => { conn.release(); res.status(404).json({ message: "Gagal update stok" }); });

          conn.commit((err) => {
            if (err) return conn.rollback(() => { conn.release(); res.status(500).json(err); });
            conn.release();

            // 🔥 LOG & NOTIF (Async)
            db.query("SELECT kode_barang, nama_barang, satuan FROM barang WHERE id = ?", [barang_id], (errN, rows) => {
              if (rows?.[0]) {
                const b = rows[0];
                const msg = `Penerimaan barang [${b.kode_barang}] ${b.nama_barang} sebanyak ${jumlah} ${b.satuan}. Ket: ${keterangan || '-'}`;
                logActivity(req.user.id, "MASUK", "STOK MASUK", msg, { req });
                kirimNotifikasiByRole("admin", "Penerimaan Barang", msg, "success");
                kirimNotifikasiByRole("gudang", "Penerimaan Barang", msg, "success");
              }
            });

            res.json({ message: "Stok berhasil ditambahkan" });
          });
        });
      });
    });
  });
};

// =============================
// STOK KELUAR (MANUAL)
// =============================
exports.tambahStokKeluar = (req, res) => {
  return res.status(403).json({ message: "Pengurangan stok hanya dapat dilakukan melalui persetujuan Pengajuan (Request) oleh pihak Pergudangan." });
};

// =============================
// READ FUNCTIONS
// =============================
exports.getStokMasuk = (req, res) => {
  const sql = `SELECT sm.*, b.nama_barang, b.kode_barang, b.satuan, b.foto, k.nama_kategori FROM stok_masuk sm JOIN barang b ON sm.barang_id = b.id LEFT JOIN kategori_barang k ON b.kategori_id = k.id ORDER BY sm.tanggal DESC`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getStokMasukById = (req, res) => {
  const sql = `SELECT sm.*, b.nama_barang, b.kode_barang, b.satuan, b.lokasi_rak, b.foto, k.nama_kategori FROM stok_masuk sm JOIN barang b ON sm.barang_id = b.id LEFT JOIN kategori_barang k ON b.kategori_id = k.id WHERE sm.id = ?`;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};

exports.getStokKeluar = (req, res) => {
  const sql = `SELECT sk.*, b.nama_barang, b.kode_barang, b.satuan, b.foto, k.nama_kategori, p.nomor_pengajuan FROM stok_keluar sk JOIN barang b ON sk.barang_id = b.id LEFT JOIN kategori_barang k ON b.kategori_id = k.id LEFT JOIN pengajuan p ON sk.pengajuan_id = p.id ORDER BY sk.tanggal DESC`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.getStokKeluarById = (req, res) => {
  const sql = `SELECT sk.*, b.nama_barang, b.kode_barang, b.satuan, b.lokasi_rak, b.foto, k.nama_kategori, p.nomor_pengajuan FROM stok_keluar sk JOIN barang b ON sk.barang_id = b.id LEFT JOIN kategori_barang k ON b.kategori_id = k.id LEFT JOIN pengajuan p ON sk.pengajuan_id = p.id WHERE sk.id = ?`;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};