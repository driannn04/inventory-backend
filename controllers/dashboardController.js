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
    // Jalankan semua query secara PARALEL (Bersamaan)
    // Ini jauh lebih cepat daripada menjalankannya satu-per-satu (nested)
    const [
      summary,
      masuk,
      keluar,
      top,
      log,
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
        SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
        FROM stok_masuk
        GROUP BY MONTH(tanggal)
      `),
      // 3. Barang Keluar
      queryPromise(`
        SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
        FROM stok_keluar
        GROUP BY MONTH(tanggal)
      `),
      // 4. Top Barang Keluar
      queryPromise(`
        SELECT b.nama_barang, SUM(sk.jumlah) as total_keluar
        FROM stok_keluar sk
        JOIN barang b ON sk.barang_id = b.id
        GROUP BY sk.barang_id
        ORDER BY total_keluar DESC
        LIMIT 5
      `),
      // 5. Aktivitas Terbaru
      queryPromise(`
        SELECT al.aksi, al.keterangan as deskripsi, al.created_at, u.nama as nama_user
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 7
      `),
      // 6. Status Pengajuan (Pie)
      queryPromise(`
        SELECT status, COUNT(*) as total
        FROM pengajuan
        GROUP BY status
      `),
      // 7. Stok Rendah
      queryPromise(`
        SELECT nama_barang, stok, stok_minimum, lokasi_rak as rak 
        FROM barang 
        WHERE stok <= stok_minimum AND is_deleted = 0
        ORDER BY stok ASC 
        LIMIT 5
      `),
      // 8. Barang Terbaru
      queryPromise(`
        SELECT nama_barang, kode_barang, satuan, created_at
        FROM barang
        WHERE is_deleted = 0
        ORDER BY created_at DESC
        LIMIT 5
      `),
      // 9. Mutasi Terbaru
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
      aktivitas_terbaru: log,
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