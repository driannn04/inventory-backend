const db = require("../config/db");
const { kirimNotifikasiByRole } = require("../utils/notifikasi");

exports.createOpname = (req, res) => {
  const { barang_id, stok_fisik, catatan } = req.body;
  const user_id = req.user.id;

  if (!barang_id || stok_fisik === undefined) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  db.beginTransaction((err) => {
    if (err) return res.status(500).json(err);

    // 1. Ambil stok sistem saat ini + LOCK ROW
    db.query("SELECT stok, nama_barang FROM barang WHERE id = ? FOR UPDATE", [barang_id], (err, result) => {
      if (err) return db.rollback(() => res.status(500).json(err));
      if (result.length === 0) return db.rollback(() => res.status(404).json({ message: "Barang tidak ditemukan" }));

      const stok_sistem = result[0].stok;
      const nama_barang = result[0].nama_barang;
      const selisih = stok_fisik - stok_sistem;

      // 2. Simpan record opname
      const sqlInsert = `
        INSERT INTO stock_opname (barang_id, stok_sistem, stok_fisik, selisih, catatan, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(sqlInsert, [barang_id, stok_sistem, stok_fisik, selisih, catatan, user_id], (err2, resInsert) => {
        if (err2) return db.rollback(() => res.status(500).json(err2));

        // 3. Update stok barang di tabel utama
        db.query("UPDATE barang SET stok = ? WHERE id = ?", [stok_fisik, barang_id], (err3) => {
          if (err3) return db.rollback(() => res.status(500).json(err3));

          db.commit((errCommit) => {
            if (errCommit) return db.rollback(() => res.status(500).json(errCommit));

            // 4. Kirim notifikasi jika ada selisih (Diluar transaksi)
            if (selisih !== 0) {
              const info = selisih > 0 ? `Kelebihan ${selisih}` : `Kekurangan ${Math.abs(selisih)}`;
              kirimNotifikasiByRole("admin", "⚠️ Selisih Stock Opname", `Ditemukan ${info} pada barang "${nama_barang}"`);
            }

            res.json({
              message: "Stock opname berhasil dicatat & stok barang diperbarui secara aman",
              selisih: selisih
            });
          });
        });
      });
    });
  });
};

exports.getOpnameHistory = (req, res) => {
  const sql = `
    SELECT so.*, b.nama_barang, b.kode_barang, u.nama as nama_user
    FROM stock_opname so
    JOIN barang b ON so.barang_id = b.id
    JOIN users u ON so.user_id = u.id
    ORDER BY so.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
