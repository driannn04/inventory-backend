const db = require("../config/db");

exports.getDashboard = async (req, res) => {

  let dashboard = {};

  // ================= SUMMARY =================
  const summaryQuery = `
  SELECT 
    (SELECT COUNT(*) FROM barang WHERE is_deleted = 0) as total_barang,
    (SELECT IFNULL(SUM(stok),0) FROM barang WHERE is_deleted = 0) as total_stok,
    (SELECT COUNT(*) FROM barang WHERE stok <= stok_minimum AND is_deleted = 0) as stok_kritis,
    (SELECT COUNT(*) FROM pengajuan WHERE status != 'completed' AND status != 'rejected') as pengajuan_pending
  `;

  db.query(summaryQuery, (err, summary) => {
    if (err) return res.status(500).json(err);

    dashboard.summary = summary[0];

    // ================= BARANG MASUK =================
    const masukQuery = `
    SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
    FROM stok_masuk
    GROUP BY MONTH(tanggal)
    `;

    db.query(masukQuery, (err2, masuk) => {
      if (err2) return res.status(500).json(err2);

      dashboard.barang_masuk_bulanan = masuk;

      // ================= BARANG KELUAR =================
      const keluarQuery = `
      SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
      FROM stok_keluar
      GROUP BY MONTH(tanggal)
      `;

      db.query(keluarQuery, (err3, keluar) => {
        if (err3) return res.status(500).json(err3);

        dashboard.barang_keluar_bulanan = keluar;

        // ================= TOP BARANG =================
        const topBarang = `
        SELECT b.nama_barang, SUM(sk.jumlah) as total_keluar
        FROM stok_keluar sk
        JOIN barang b ON sk.barang_id = b.id
        GROUP BY sk.barang_id
        ORDER BY total_keluar DESC
        LIMIT 5
        `;

        db.query(topBarang, (err4, top) => {
          if (err4) return res.status(500).json(err4);

          dashboard.top_barang_keluar = top;

          // ================= AKTIVITAS TERBARU (FIX TOTAL) =================
          const aktivitas = `
          SELECT 
            al.aksi,
            al.keterangan as deskripsi,
            al.created_at,
            u.nama as nama_user
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.created_at DESC
          LIMIT 7
          `;

          db.query(aktivitas, (err5, log) => {
            if (err5) return res.status(500).json(err5);

            dashboard.aktivitas_terbaru = log;

            // ================= STATUS PENGAJUAN (PIE CHART) =================
            const statusQuery = `
            SELECT status, COUNT(*) as total
            FROM pengajuan
            GROUP BY status
            `;

            db.query(statusQuery, (err6, statusData) => {
              if (err6) {
                console.error("6", err6);
                return res.status(500).json({ error: "Gagal memuat status pengajuan" });
              }

              dashboard.status_pengajuan = statusData || [];

              // ================= STOK RENDAH =================
              const lowStockQuery = `
              SELECT nama_barang, stok, stok_minimum, lokasi_rak as rak 
              FROM barang 
              WHERE stok <= stok_minimum AND is_deleted = 0
              ORDER BY stok ASC 
              LIMIT 5
              `;

              db.query(lowStockQuery, (err7, lowStock) => {
                if (err7) {
                  console.error("7", err7);
                  // Jangan crash, kirim array kosong saja jika gagal
                  dashboard.stok_rendah = [];
                } else {
                  dashboard.stok_rendah = lowStock || [];
                }

                // ================= BARANG TERBARU =================
                const latestItemsQuery = `
                SELECT nama_barang, kode_barang, satuan, created_at
                FROM barang
                WHERE is_deleted = 0
                ORDER BY created_at DESC
                LIMIT 5
                `;

                db.query(latestItemsQuery, (err8, latest) => {
                  if (err8) {
                    console.error("8", err8);
                    dashboard.barang_terbaru = [];
                  } else {
                    dashboard.barang_terbaru = latest || [];
                  }

                  // ================= MUTASI TERBARU (LANDSCAPE) =================
                  const mutasiRecord = `
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
                  `;

                  db.query(mutasiRecord, (err9, mutasi) => {
                    if (err9) {
                      console.error("9", err9);
                      dashboard.mutasi_terbaru = [];
                    } else {
                      dashboard.mutasi_terbaru = mutasi || [];
                    }

                    res.json(dashboard);
                  });
                });
              });
            });
          });

        });

      });

    });

  });

};


// OPTIONAL
exports.getAktivitas = (req, res) => {
  const sql = `
  SELECT 
    nomor_pengajuan as deskripsi,
    status,
    created_at as tanggal
  FROM pengajuan
  ORDER BY created_at DESC
  LIMIT 10
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};