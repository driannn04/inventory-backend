const db = require("../config/db");

exports.getSatuan = (req, res) => {
  const sql = "SELECT * FROM satuan ORDER BY nama_satuan ASC";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.createSatuan = (req, res) => {
  const { nama_satuan } = req.body;
  const sql = "INSERT INTO satuan (nama_satuan) VALUES (?)";
  db.query(sql, [nama_satuan], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Satuan sudah ada" });
      return res.status(500).json(err);
    }
    res.json({ message: "Satuan berhasil ditambahkan", id: result.insertId });
  });
};
