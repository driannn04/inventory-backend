const db = require("../config/db");
const { kirimNotifikasi, kirimNotifikasiByRole } = require("../utils/notifikasi");

// =============================
// STOK MASUK (FIX TOTAL)
// =============================
exports.tambahStokMasuk = (req, res) => {
  let { barang_id, jumlah, keterangan, supplier_id } = req.body;

  barang_id = parseInt(barang_id);
  jumlah = parseInt(jumlah);

  if (!barang_id || !jumlah || jumlah <= 0) {
    return res.status(400).json({
      message: "Data tidak valid"
    });
  }

  const tanggal = new Date();

  const sqlMasuk = `
    INSERT INTO stok_masuk (barang_id,supplier_id,jumlah,tanggal,keterangan)
    VALUES (?,?,?,?,?)
  `;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json(err);

    db.query(sqlMasuk, [barang_id, supplier_id || null, jumlah, tanggal, keterangan], (err) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      const sqlUpdate = `
        UPDATE barang
        SET stok = stok + ?
        WHERE id = ?
      `;

      // Lock row for safety (optional for increment but good practice in WMS)
      db.query("SELECT id FROM barang WHERE id = ? FOR UPDATE", [barang_id], (errLock) => {
        if (errLock) return db.rollback(() => res.status(500).json(errLock));

        db.query(sqlUpdate, [jumlah, barang_id], (err, result) => {
          if (err) {
            return db.rollback(() => res.status(500).json(err));
          }

          if (result.affectedRows === 0) {
            return db.rollback(() =>
              res.status(404).json({ message: "Barang tidak ditemukan" })
            );
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => res.status(500).json(err));
            }

            // 🔥 NOTIF KE ADMIN (ROLE) — pakai nama barang
            const sqlNama = "SELECT nama_barang, satuan FROM barang WHERE id = ?";
            db.query(sqlNama, [barang_id], (errNama, rowsNama) => {
              const nama = rowsNama?.[0]?.nama_barang || `ID ${barang_id}`;
              const satuan = rowsNama?.[0]?.satuan || 'unit';
              kirimNotifikasiByRole(
                "admin",
                "📦 Stok Masuk",
                `${nama} bertambah ${jumlah} ${satuan}`
              );
            });

            res.json({
              message: "Stok berhasil ditambahkan"
            });
          });
        });
      });
    });
  });
};

// =============================
exports.getStokMasuk = (req, res) => {
  const sql = `
    SELECT stok_masuk.*, barang.nama_barang, barang.kode_barang, barang.satuan, barang.stok as stok_sekarang,
           supplier.nama_supplier, kategori_barang.nama_kategori
    FROM stok_masuk
    JOIN barang ON stok_masuk.barang_id = barang.id
    LEFT JOIN supplier ON stok_masuk.supplier_id = supplier.id
    LEFT JOIN kategori_barang ON barang.kategori_id = kategori_barang.id
    ORDER BY stok_masuk.tanggal DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// DETAIL STOK MASUK BY ID
// =============================
exports.getStokMasukById = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT stok_masuk.*, barang.nama_barang, barang.kode_barang, barang.satuan, barang.stok as stok_sekarang,
           barang.lokasi_rak, supplier.nama_supplier, supplier.alamat as alamat_supplier,
           supplier.no_telp as telp_supplier, kategori_barang.nama_kategori
    FROM stok_masuk
    JOIN barang ON stok_masuk.barang_id = barang.id
    LEFT JOIN supplier ON stok_masuk.supplier_id = supplier.id
    LEFT JOIN kategori_barang ON barang.kategori_id = kategori_barang.id
    WHERE stok_masuk.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json(result[0]);
  });
};

exports.tambahStokKeluar = (req, res) => {
  let { barang_id, jumlah, keterangan } = req.body;

  barang_id = parseInt(barang_id);
  jumlah = parseInt(jumlah);

  if (!barang_id || !jumlah || jumlah <= 0) {
    return res.status(400).json({
      message: "Data tidak valid"
    });
  }

  const tanggal = new Date();

  const cekStok = `SELECT stok FROM barang WHERE id = ? FOR UPDATE`;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json(err);

    db.query(cekStok, [barang_id], (err, result) => {
      if (err) {
        return db.rollback(() => res.status(500).json(err));
      }

      if (result.length === 0) {
        return db.rollback(() =>
          res.status(404).json({ message: "Barang tidak ditemukan" })
        );
      }

      const stokSekarang = result[0].stok;

      if (stokSekarang < jumlah) {
        return db.rollback(() =>
          res.status(400).json({ message: "Stok tidak mencukupi" })
        );
      }

      const sqlKeluar = `
        INSERT INTO stok_keluar (barang_id,jumlah,tanggal,keterangan)
        VALUES (?,?,?,?)
      `;

      db.query(sqlKeluar, [barang_id, jumlah, tanggal, keterangan], (err) => {
        if (err) {
          return db.rollback(() => res.status(500).json(err));
        }

        const updateStok = `
          UPDATE barang
          SET stok = stok - ?
          WHERE id = ?
        `;

        db.query(updateStok, [jumlah, barang_id], (err) => {
          if (err) {
            return db.rollback(() => res.status(500).json(err));
          }

          // 🔥 CEK STOK MINIMUM
          const cekMinimum = `
            SELECT nama_barang, stok, stok_minimum 
            FROM barang WHERE id = ?
          `;

          db.query(cekMinimum, [barang_id], (err2, result2) => {
            if (!err2 && result2.length > 0) {
              const barang = result2[0];

              if (barang.stok <= barang.stok_minimum) {
                kirimNotifikasiByRole(
                  "admin",
                  "⚠️ Stok Minimum",
                  `${barang.nama_barang} hampir habis (stok: ${barang.stok})`
                );
              }
            }
          });

          db.commit((err) => {
            if (err) {
              return db.rollback(() => res.status(500).json(err));
            }

            // 🔥 NOTIF ADMIN — pakai nama barang
            const sqlNama2 = "SELECT nama_barang, satuan FROM barang WHERE id = ?";
            db.query(sqlNama2, [barang_id], (errNama2, rowsNama2) => {
              const nama = rowsNama2?.[0]?.nama_barang || `ID ${barang_id}`;
              const satuan = rowsNama2?.[0]?.satuan || 'unit';
              kirimNotifikasiByRole(
                "admin",
                "📤 Stok Keluar",
                `${nama} berkurang ${jumlah} ${satuan}`
              );
            });

            res.json({
              message: "Stok berhasil dikurangi"
            });
          });
        });
      });
    });
  });
};

// =============================
exports.getStokKeluar = (req, res) => {
  const sql = `
    SELECT stok_keluar.*, barang.nama_barang, barang.kode_barang, barang.satuan, barang.stok as stok_sekarang,
           kategori_barang.nama_kategori,
           pengajuan.nomor_pengajuan
    FROM stok_keluar
    JOIN barang ON stok_keluar.barang_id = barang.id
    LEFT JOIN kategori_barang ON barang.kategori_id = kategori_barang.id
    LEFT JOIN pengajuan ON stok_keluar.pengajuan_id = pengajuan.id
    ORDER BY stok_keluar.tanggal DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// =============================
// DETAIL STOK KELUAR BY ID
// =============================
exports.getStokKeluarById = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT stok_keluar.*, barang.nama_barang, barang.kode_barang, barang.satuan, barang.stok as stok_sekarang,
           barang.lokasi_rak, kategori_barang.nama_kategori,
           pengajuan.nomor_pengajuan, pengajuan.status as status_pengajuan,
           pengajuan.catatan as catatan_pengajuan
    FROM stok_keluar
    JOIN barang ON stok_keluar.barang_id = barang.id
    LEFT JOIN kategori_barang ON barang.kategori_id = kategori_barang.id
    LEFT JOIN pengajuan ON stok_keluar.pengajuan_id = pengajuan.id
    WHERE stok_keluar.id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json(result[0]);
  });
};