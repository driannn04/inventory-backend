const db = require("../config/db");

// 1. LAPORAN STOK (GLOBAL)
exports.laporanStok = (req, res) => {
  const sql = `SELECT kode_barang, nama_barang, satuan, stok FROM barang WHERE is_deleted = 0`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 2. LAPORAN BARANG MASUK (GLOBAL - ADMIN/GUDANG)
exports.laporanBarangMasuk = (req, res) => {
  const { start, end } = req.query;
  const sql = `
    SELECT b.nama_barang, sm.jumlah, b.satuan, sm.tanggal, sm.keterangan
    FROM stok_masuk sm
    JOIN barang b ON sm.barang_id = b.id
    WHERE DATE(sm.tanggal) BETWEEN ? AND ?
    ORDER BY sm.tanggal DESC
  `;
  db.query(sql, [start, end], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 3. LAPORAN BARANG KELUAR (FILTERED BY HIERARCHY)
exports.laporanBarangKeluar = (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept } = req.user;

  let sql = `
    SELECT b.nama_barang, sk.jumlah, b.satuan, sk.tanggal, u.nama as pemohon, 
           sd.nama_sub as unit, d.nama_dept as divisi
    FROM stok_keluar sk
    JOIN barang b ON sk.barang_id = b.id
    LEFT JOIN pengajuan p ON sk.pengajuan_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE DATE(sk.tanggal) BETWEEN ? AND ?
  `;

  const params = [start, end];

  if (role === "manager") {
    sql += " AND u.id_dept = ?";
    params.push(id_dept);
  } else if (role === "asisten_manager") {
    sql += " AND u.id_subdept = ?";
    params.push(id_subdept);
  }

  sql += " ORDER BY sk.tanggal DESC";

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 4. LAPORAN RIWAYAT PENGAJUAN (DETAIL PER BARANG)
exports.laporanPengajuan = (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept } = req.user;

  let sql = `
    SELECT p.nomor_pengajuan, p.tanggal_pengajuan, p.status, p.urgensi,
           u.nama as pemohon, sd.nama_sub as unit,
           b.nama_barang, pd.jumlah, b.satuan
    FROM pengajuan p
    JOIN pengajuan_detail pd ON p.id = pd.pengajuan_id
    JOIN barang b ON pd.barang_id = b.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE DATE(p.tanggal_pengajuan) BETWEEN ? AND ?
  `;

  const params = [start, end];

  if (role === "manager") {
    sql += " AND u.id_dept = ?";
    params.push(id_dept);
  } else if (role === "asisten_manager") {
    sql += " AND u.id_subdept = ?";
    params.push(id_subdept);
  }

  sql += " ORDER BY p.tanggal_pengajuan DESC, p.nomor_pengajuan DESC";

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
