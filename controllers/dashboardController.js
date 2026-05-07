const db = require("../config/db");

// Helper function untuk menjalankan query dengan Promise
const queryPromise = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

exports.getDashboard = async (req, res) => {
  try {
    const { chartRange = 'year', pieRange = 'year', topRange = 'year' } = req.query;
    
    // Helper untuk membuat filter berdasarkan range
    const getFilter = (range, col = 'tanggal') => {
      if (range === '7d') return `WHERE ${col} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
      if (range === '30d') return `WHERE ${col} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
      if (range === '6m') return `WHERE ${col} >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)`;
      return `WHERE YEAR(${col}) = YEAR(CURDATE())`;
    };

    const chartFilter = getFilter(chartRange);
    const pieFilter = getFilter(pieRange, 'created_at');
    const topFilter = getFilter(topRange);

    // Grouping khusus grafik
    let groupBy = "MONTH(tanggal)";
    if (chartRange === '7d' || chartRange === '30d') groupBy = "DATE(tanggal)";
    // Jalankan semua query secara PARALEL (Bersamaan)
    // Ini jauh lebih cepat daripada menjalankannya satu-per-satu (nested)
    // Jalankan semua query secara PARALEL (Bersamaan)
    const [
      summary,
      masuk,
      keluar,
      top,
      statusData,
      lowStock,
      latest,
      mutasi
    ] = await Promise.all([
      // 1. Summary
      queryPromise(`
        SELECT 
          (SELECT COUNT(*) FROM barang WHERE is_deleted = 0) as total_barang,
          (SELECT IFNULL(SUM(stok),0) FROM barang WHERE is_deleted = 0) as total_stok,
          (SELECT COUNT(*) FROM barang WHERE stok <= stok_minimum AND is_deleted = 0) as stok_kritis,
          (SELECT COUNT(*) FROM pengajuan WHERE status != 'completed' AND status != 'rejected') as pengajuan_pending
      `),
      // 2. Barang Masuk
      queryPromise(`
        SELECT ${groupBy} as label, SUM(jumlah) as total
        FROM stok_masuk
        ${chartFilter}
        GROUP BY label
        ORDER BY label ASC
      `),
      // 3. Barang Keluar
      queryPromise(`
        SELECT ${groupBy} as label, SUM(jumlah) as total
        FROM stok_keluar
        ${chartFilter}
        GROUP BY label
        ORDER BY label ASC
      `),
      // 4. Top Barang Keluar
      queryPromise(`
        SELECT b.nama_barang, SUM(sk.jumlah) as total_keluar
        FROM stok_keluar sk
        JOIN barang b ON sk.barang_id = b.id
        ${topFilter}
        GROUP BY sk.barang_id, b.nama_barang
        ORDER BY total_keluar DESC
        LIMIT 5
      `),
      // 5. Status Pengajuan (Pie)
      queryPromise(`
        SELECT status, COUNT(*) as total
        FROM pengajuan
        ${pieFilter}
        GROUP BY status
      `),
      // 6. Stok Rendah
      queryPromise(`
        SELECT nama_barang, stok, stok_minimum, lokasi_rak as rak 
        FROM barang 
        WHERE stok <= stok_minimum AND is_deleted = 0
        ORDER BY stok ASC 
        LIMIT 5
      `),
      // 7. Barang Terbaru
      queryPromise(`
        SELECT nama_barang, kode_barang, satuan, created_at
        FROM barang
        WHERE is_deleted = 0
        ORDER BY created_at DESC
        LIMIT 5
      `),
      // 8. Mutasi Terbaru
      queryPromise(`
        SELECT * FROM (
          (SELECT 'masuk' as jenis, b.nama_barang, b.foto, sm.jumlah, sm.tanggal, sm.keterangan, sm.id
           FROM stok_masuk sm
           JOIN barang b ON sm.barang_id = b.id
           ORDER BY sm.tanggal DESC, sm.id DESC
           LIMIT 10)
          UNION ALL
          (SELECT 'keluar' as jenis, b.nama_barang, b.foto, sk.jumlah, sk.tanggal, sk.keterangan, sk.id
           FROM stok_keluar sk
           JOIN barang b ON sk.barang_id = b.id
           ORDER BY sk.tanggal DESC, sk.id DESC
           LIMIT 10)
        ) as combined
        ORDER BY tanggal DESC, id DESC
        LIMIT 8
      `)
    ]);

    // Susun objek dashboard
    const dashboard = {
      summary: summary[0],
      barang_masuk_bulanan: masuk,
      barang_keluar_bulanan: keluar,
      top_barang_keluar: top,
      status_pengajuan: statusData,
      stok_rendah: lowStock,
      barang_terbaru: latest,
      mutasi_terbaru: mutasi
    };

    res.json(dashboard);

  } catch (err) {
    console.error("Dashboard Optimization Error:", err);
    res.status(500).json({ message: "Gagal memuat dashboard", error: err.message });
  }
};

exports.getAktivitas = (req, res) => {
  const sql = `
  SELECT nomor_pengajuan as deskripsi, status, created_at as tanggal
  FROM pengajuan
  ORDER BY created_at DESC
  LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};