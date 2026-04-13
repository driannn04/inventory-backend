const db = require("../config/db");

// 1. Ambil Semua Supplier
exports.getSuppliers = (req, res) => {
  const sql = "SELECT * FROM supplier ORDER BY created_at DESC";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 2. Tambah Supplier Baru
exports.createSupplier = (req, res) => {
  let { nama_supplier, pic, no_telp, email, alamat, kode_supplier } = req.body;

  // Auto Generate Kode jika kosong
  if (!kode_supplier) {
    kode_supplier = "SUP-" + Date.now().toString().slice(-6);
  }

  const sql = `
    INSERT INTO supplier (kode_supplier, nama_supplier, pic, no_telp, email, alamat)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [kode_supplier, nama_supplier, pic, no_telp, email, alamat], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: "Kode supplier sudah digunakan" });
      }
      return res.status(500).json(err);
    }
    res.json({ message: "Supplier berhasil ditambahkan", id: result.insertId });
  });
};

// 3. Update Supplier
exports.updateSupplier = (req, res) => {
  const { id } = req.params;
  const { nama_supplier, pic, no_telp, email, alamat, kode_supplier } = req.body;

  const sql = `
    UPDATE supplier 
    SET kode_supplier=?, nama_supplier=?, pic=?, no_telp=?, email=?, alamat=?
    WHERE id=?
  `;

  db.query(sql, [kode_supplier, nama_supplier, pic, no_telp, email, alamat, id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Supplier berhasil diupdate" });
  });
};

// 4. Hapus Supplier (Dengan Proteksi)
exports.deleteSupplier = (req, res) => {
  const { id } = req.params;

  // Proteksi: Cek apakah sudah ada transaksi stok_masuk
  const sqlCek = "SELECT COUNT(*) as total FROM stok_masuk WHERE supplier_id = ?";
  
  db.query(sqlCek, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    
    if (result[0].total > 0) {
      return res.status(400).json({ 
        message: "Supplier tidak bisa dihapus karena sudah memiliki riwayat pengiriman barang." 
      });
    }

    const sqlDel = "DELETE FROM supplier WHERE id = ?";
    db.query(sqlDel, [id], (err2, result2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "Supplier berhasil dihapus" });
    });
  });
};
