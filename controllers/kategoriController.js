const db = require("../config/db");

// 1. GET ALL KATEGORI
exports.getKategori = (req, res) => {
  const sql = "SELECT * FROM kategori_barang ORDER BY id ASC";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 2. GET KATEGORI BY ID
exports.getKategoriById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM kategori_barang WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Kategori tidak ditemukan" });
    res.json(result[0]);
  });
};

// 3. CREATE KATEGORI
exports.createKategori = (req, res) => {
  const { nama_kategori, deskripsi } = req.body;

  if (!nama_kategori) {
    return res.status(400).json({ message: "Nama kategori wajib diisi" });
  }

  // Cek duplikat
  db.query("SELECT id FROM kategori_barang WHERE nama_kategori = ?", [nama_kategori], (err, existing) => {
    if (err) return res.status(500).json(err);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Kategori sudah ada" });
    }

    const sql = "INSERT INTO kategori_barang (nama_kategori, deskripsi) VALUES (?, ?)";
    db.query(sql, [nama_kategori, deskripsi || null], (err2, result) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "Kategori berhasil ditambahkan", id: result.insertId });
    });
  });
};

// 4. UPDATE KATEGORI
exports.updateKategori = (req, res) => {
  const { id } = req.params;
  const { nama_kategori, deskripsi } = req.body;

  if (!nama_kategori) {
    return res.status(400).json({ message: "Nama kategori wajib diisi" });
  }

  const sql = "UPDATE kategori_barang SET nama_kategori=?, deskripsi=? WHERE id=?";
  db.query(sql, [nama_kategori, deskripsi || null, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Kategori berhasil diupdate" });
  });
};

// 5. DELETE KATEGORI
exports.deleteKategori = (req, res) => {
  const { id } = req.params;

  // Proteksi: cek apakah kategori masih dipakai
  db.query("SELECT COUNT(*) as total FROM barang WHERE kategori_id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result[0].total > 0) {
      return res.status(400).json({
        message: `Kategori tidak bisa dihapus karena masih digunakan oleh ${result[0].total} barang.`
      });
    }

    db.query("DELETE FROM kategori_barang WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "Kategori berhasil dihapus" });
    });
  });
};
