const db = require("../config/db");
const QRCode = require("qrcode");
const response = require("../utils/response");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const { kirimNotifikasi, kirimNotifikasiByRole } = require("../utils/notifikasi");
const { logActivity } = require("../utils/activityLogger");

// 🔥 AUTO GENERATE KODE BARANG
const generateKodeBarang = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BRG-${Date.now()}-${random}`;
};

const getKartuStokData = (barangId, startDate, endDate, callback) => {
  const sqlBarang = `
    SELECT id, kode_barang, nama_barang, satuan, stok
    FROM barang
    WHERE id = ? AND is_deleted = 0
  `;

  db.query(sqlBarang, [barangId], (err, barangRows) => {
    if (err) return callback(err);
    if (barangRows.length === 0) return callback(null, null);

    const barang = barangRows[0];
    const useDateFilter = !!(startDate && endDate);
    const dateFilter = useDateFilter ? " AND DATE(tanggal) BETWEEN ? AND ?" : "";

    const sqlMutasi = `
      SELECT 
        id,
        tanggal,
        'masuk' AS jenis,
        jumlah,
        keterangan,
        NULL AS pengajuan_id
      FROM stok_masuk
      WHERE barang_id = ? ${dateFilter}

      UNION ALL

      SELECT
        id,
        tanggal,
        'keluar' AS jenis,
        jumlah,
        keterangan,
        pengajuan_id
      FROM stok_keluar
      WHERE barang_id = ? ${dateFilter}



      ORDER BY tanggal ASC, id ASC
    `;

    const params = useDateFilter
      ? [barangId, startDate, endDate, barangId, startDate, endDate]
      : [barangId, barangId];

    db.query(sqlMutasi, params, (err2, mutasiRows) => {
      if (err2) return callback(err2);

      let totalMasuk = 0;
      let totalKeluar = 0;

      mutasiRows.forEach((row) => {
        const qty = parseInt(row.jumlah) || 0;
        if (row.jenis === "masuk") totalMasuk += qty;
        if (row.jenis === "keluar") totalKeluar += qty;
      });

      const stokAkhir = parseInt(barang.stok) || 0;
      const saldoAwal = stokAkhir - totalMasuk + totalKeluar;
      const saldoAwalRingkasan = useDateFilter ? saldoAwal : null;
      let saldoBerjalan = saldoAwal;

      const mutasiDenganSaldo = mutasiRows.map((row) => {
        const qty = parseInt(row.jumlah) || 0;
        const saldoSebelum = saldoBerjalan;

        if (row.jenis === "masuk") saldoBerjalan += qty;
        if (row.jenis === "keluar") saldoBerjalan -= qty;

        return {
          ...row,
          jumlah: qty,
          saldo_sebelum: saldoSebelum,
          saldo_setelah: saldoBerjalan
        };
      });

      return callback(null, {
        barang: {
          id: barang.id,
          kode_barang: barang.kode_barang,
          nama_barang: barang.nama_barang,
          satuan: barang.satuan
        },
        summary: {
          saldo_awal_estimasi: saldoAwalRingkasan,
          total_masuk: totalMasuk,
          total_keluar: totalKeluar,
          stok_akhir: stokAkhir,
          periode: useDateFilter ? { start: startDate, end: endDate } : null
        },
        mutasi: mutasiDenganSaldo
      });
    });
  });
};

// =============================
// ambil semua barang
// =============================
exports.getBarang = (req, res) => {

  const sql = `
    SELECT 
      b.*, 
      k.nama_kategori,
      GREATEST(0, (b.stok - IFNULL((
          SELECT SUM(pd.jumlah) 
          FROM pengajuan_detail pd
          JOIN pengajuan p ON pd.pengajuan_id = p.id
          WHERE pd.barang_id = b.id 
          AND p.status IN ('pending_asisten_manager', 'pending_manager', 'pending_gudang')
      ), 0))) as stok_tersedia
    FROM barang b
    LEFT JOIN kategori_barang k ON b.kategori_id = k.id
    WHERE b.is_deleted = 0
  `;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(result);
  });

};

// =============================
// TAMBAH BARANG (FIX AUTO KODE)
// =============================
exports.tambahBarang = async (req, res) => {

  try {

    let {
      kode_barang,
      nama_barang,
      kategori_id,
      satuan,
      stok,
      stok_minimum,
      lokasi_rak
    } = req.body;

    // 🔥 FIX NULL kode_barang
    if (!kode_barang || kode_barang === "null" || kode_barang === "") {
      kode_barang = generateKodeBarang();
    }

    const { processImage } = require("../utils/uploadHelper");

    // QR
    const qrData = JSON.stringify({
      kode_barang: kode_barang
    });

    const qrCode = await QRCode.toDataURL(qrData);

    const sql = `
INSERT INTO barang
(kode_barang,nama_barang,kategori_id,satuan,stok,stok_minimum,lokasi_rak,qr_code)
VALUES (?,?,?,?,?,?,?,?)
`;

    db.query(sql,
      [
        kode_barang,
        nama_barang,
        kategori_id,
        satuan,
        stok,
        stok_minimum,
        lokasi_rak,
        qrCode
      ],
      async (err, result) => {
        if (err) {
          return res.status(500).json(err);
        }

        const newId = result.insertId;

        // ✅ PROSES GAMBAR DENGAN SHARP & FOLDERING ID
        if (req.file) {
          try {
            const dbPath = await processImage(req.file, "barang", newId);
            db.query("UPDATE barang SET foto = ? WHERE id = ?", [dbPath, newId]);
          } catch (imgErr) {
            console.error("❌ Gagal memproses gambar:", imgErr.message);
          }
        }

        // 🔥 LOG AKTIVITAS
        const msg = `Berhasil mendaftarkan barang baru: [${kode_barang}] ${nama_barang} dengan stok awal ${stok} ${satuan}.`;
        logActivity(req.user.id, "TAMBAH", "BARANG", msg, { req, dataBaru: req.body });
        
        // 🔥 NOTIFIKASI BARANG BARU
        kirimNotifikasiByRole("admin", "Registrasi Barang Baru", msg);
        kirimNotifikasiByRole("gudang", "Registrasi Barang Baru", msg);

        // 🔥 FIX: Jika ada stok awal, masukkan ke riwayat mutasi stok_masuk agar Kartu Stok tidak ngaco
        if (parseInt(stok) > 0) {
          const sqlInitialStok = "INSERT INTO stok_masuk (barang_id, jumlah, tanggal, keterangan) VALUES (?, ?, NOW(), ?)";
          db.query(sqlInitialStok, [newId, stok, "Stok awal saat pendaftaran barang"], (errStok) => {
             if (errStok) console.error("❌ Gagal input stok awal ke mutasi:", errStok.message);
          });
        }

        res.json({
          message: "Barang berhasil ditambahkan",
          kode_barang // 🔥 kirim balik
        });

      });

  } catch (err) {

    res.status(500).json(err);

  }

};

// =============================
exports.getBarangById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT 
      b.*, 
      k.nama_kategori,
      GREATEST(0, (b.stok - IFNULL((
          SELECT SUM(pd.jumlah) 
          FROM pengajuan_detail pd
          JOIN pengajuan p ON pd.pengajuan_id = p.id
          WHERE pd.barang_id = b.id 
          AND p.status IN ('pending_asisten_manager', 'pending_manager', 'pending_gudang')
      ), 0))) as stok_tersedia
    FROM barang b
    JOIN kategori_barang k ON b.kategori_id = k.id
    WHERE b.id = ? AND b.is_deleted = 0
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};

// =============================
exports.updateBarang = async (req, res) => {

  const id = req.params.id;

  const {
    nama_barang,
    kategori_id,
    satuan,
    stok,
    stok_minimum,
    lokasi_rak
  } = req.body;

  let foto = null;

  if (req.file) {
    try {
      const { processImage } = require("../utils/uploadHelper");
      foto = await processImage(req.file, "barang", id);
    } catch (imgErr) {
      console.error("❌ Gagal memproses gambar update:", imgErr.message);
    }
  }

  const sql = `
UPDATE barang
SET 
nama_barang = ?,
kategori_id = ?,
satuan = ?,
stok = ?,
stok_minimum = ?,
lokasi_rak = ?,
foto = COALESCE(?, foto)
WHERE id = ?
`;

  db.query("SELECT * FROM barang WHERE id = ?", [id], (errOld, oldRows) => {
    const dataLama = oldRows?.[0] || null;

    db.query(sql, [
      nama_barang,
      kategori_id,
      satuan,
      stok,
      stok_minimum,
      lokasi_rak,
      foto,
      id
    ], (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      // 🔥 LOG AKTIVITAS (DENGAN DETAIL PERUBAHAN)
      logActivity(req.user.id, "EDIT", "BARANG", `Mengubah informasi barang: [${id}] ${nama_barang}`, { 
        req, 
        dataLama: dataLama,
        dataBaru: req.body 
      });

      res.json({
        message: "Barang berhasil diupdate"
      });
    });
  });

};

// =============================
exports.deleteBarang = (req, res) => {
  const id = req.params.id;

  // 1. Ambil info barang dulu untuk notif
  db.query("SELECT nama_barang, kode_barang FROM barang WHERE id = ?", [id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ message: "Barang tidak ditemukan" });
    const b = rows[0];

    const sql = "UPDATE barang SET is_deleted = 1 WHERE id=?";
    db.query(sql, [id], (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Barang berhasil dinonaktifkan" });

      // 🔥 LOG AKTIVITAS
      logActivity(req.user.id, "HAPUS", "BARANG", `Menonaktifkan barang: [${b.kode_barang}] ${b.nama_barang}`, { req });

      // 🔥 NOTIFIKASI HAPUS BARANG (DETAIL)
      const msg = `Barang [${b.kode_barang}] ${b.nama_barang} telah dinonaktifkan dari sistem oleh Admin.`;
      kirimNotifikasiByRole("admin", "Penghapusan Barang", msg);
      kirimNotifikasiByRole("gudang", "Penghapusan Barang", msg);
    });
  });
};

// =============================
exports.generateQR = async (req, res) => {

  const { id } = req.params;

  const sql = "SELECT * FROM barang WHERE id=? AND is_deleted=0";

  db.query(sql, [id], async (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }

    const barang = result[0];

    const qrData = JSON.stringify({
      kode_barang: barang.kode_barang
    });

    const qr = await QRCode.toDataURL(qrData);

    res.json({
      barang: barang.nama_barang,
      qr_code: qr
    });

  });

};

// =============================
exports.searchBarang = (req, res) => {

  const { keyword } = req.query;

  const sql = `
SELECT * FROM barang
WHERE (nama_barang LIKE ? OR kode_barang LIKE ?)
AND is_deleted = 0
`;

  const search = `%${keyword}%`;

  db.query(sql, [search, search], (err, result) => {

    if (err) return res.status(500).json(err);

    res.json(result);

  });

};

// =============================
exports.getStokMinimum = (req, res) => {

  const sql = `
SELECT nama_barang,stok,stok_minimum
FROM barang
WHERE stok <= stok_minimum AND is_deleted = 0
`;

  db.query(sql, (err, result) => {

    if (err) return res.status(500).json(err);

    res.json(result);

  });

};

// =============================
exports.getBarangPagination = (req, res) => {

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const offset = (page - 1) * limit;

  const sql = `
    SELECT 
      b.*, 
      GREATEST(0, (b.stok - IFNULL((
          SELECT SUM(pd.jumlah) 
          FROM pengajuan_detail pd
          JOIN pengajuan p ON pd.pengajuan_id = p.id
          WHERE pd.barang_id = b.id 
          AND p.status IN ('pending_asisten_manager', 'pending_manager', 'pending_gudang')
      ), 0))) as stok_tersedia
    FROM barang b
    WHERE b.is_deleted = 0
    LIMIT ? OFFSET ?
  `;

  db.query(sql, [limit, offset], (err, data) => {

    if (err) return response.error(res, "Gagal mengambil data");

    const countQuery = "SELECT COUNT(*) as total FROM barang WHERE is_deleted = 0";

    db.query(countQuery, (err2, count) => {

      const total = count[0].total;

      const meta = {
        page: page,
        limit: limit,
        total_data: total,
        total_page: Math.ceil(total / limit)
      };

      response.success(res, "Data barang berhasil diambil", data, meta);

    });

  });

};

// =============================
// KARTU STOK PER BARANG
// =============================
exports.getKartuStokByBarang = (req, res) => {
  const barangId = parseInt(req.params.id);
  const { start, end } = req.query;

  if (!barangId) {
    return res.status(400).json({ message: "ID barang tidak valid" });
  }

  if ((start && !end) || (!start && end)) {
    return res.status(400).json({ message: "Filter tanggal harus lengkap (start dan end)" });
  }

  getKartuStokData(barangId, start, end, (err, data) => {
    if (err) return res.status(500).json(err);
    if (!data) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }
    return res.json(data);
  });
};

exports.exportKartuStokExcel = (req, res) => {
  const barangId = parseInt(req.params.id);
  const { start, end } = req.query;

  if (!barangId) {
    return res.status(400).json({ message: "ID barang tidak valid" });
  }

  if ((start && !end) || (!start && end)) {
    return res.status(400).json({ message: "Filter tanggal harus lengkap (start dan end)" });
  }

  getKartuStokData(barangId, start, end, (err, data) => {
    if (err) return res.status(500).json(err);
    if (!data) return res.status(404).json({ message: "Barang tidak ditemukan" });

    const rows = data.mutasi.map((item) => ({
      tanggal: item.tanggal,
      jenis: item.jenis,
      qty: item.jumlah,
      saldo_sebelum: item.saldo_sebelum,
      saldo_setelah: item.saldo_setelah,
      referensi_pengajuan: item.pengajuan_id || "-",
      keterangan: item.keterangan || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KartuStok");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = `kartu_stok_${data.barang.kode_barang}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    return res.send(buffer);
  });
};

exports.exportKartuStokPDF = (req, res) => {
  const barangId = parseInt(req.params.id);
  const { start, end } = req.query;

  if (!barangId) {
    return res.status(400).json({ message: "ID barang tidak valid" });
  }

  if ((start && !end) || (!start && end)) {
    return res.status(400).json({ message: "Filter tanggal harus lengkap (start dan end)" });
  }

  getKartuStokData(barangId, start, end, (err, data) => {
    if (err) return res.status(500).json(err);
    if (!data) return res.status(404).json({ message: "Barang tidak ditemukan" });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const fileName = `kartu_stok_${data.barang.kode_barang}.pdf`;

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    doc.pipe(res);

    doc.fontSize(16).text("Kartu Stok Barang", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Barang: ${data.barang.nama_barang} (${data.barang.kode_barang})`);
    doc.text(`Satuan: ${data.barang.satuan || "-"}`);
    if (data.summary.periode) {
      doc.text(`Periode: ${data.summary.periode.start} s/d ${data.summary.periode.end}`);
    } else {
      doc.text("Periode: Semua data");
    }
    doc.text(`Stok akhir: ${data.summary.stok_akhir}`);
    doc.moveDown(0.8);

    data.mutasi.forEach((item, idx) => {
      doc
        .fontSize(10)
        .text(
          `${idx + 1}. ${item.tanggal} | ${item.jenis.toUpperCase()} | qty ${item.jumlah} | saldo ${item.saldo_sebelum} -> ${item.saldo_setelah} | ref: ${item.pengajuan_id || "-"} | ${item.keterangan || "-"}`
        );
      if (doc.y > 760) doc.addPage();
    });

    doc.end();
  });
};

// =============================
exports.downloadQR = (req, res) => {

  const { id } = req.params;

  const sql = "SELECT qr_code FROM barang WHERE id=?";

  db.query(sql, [id], (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ message: "Barang tidak ditemukan" });
    }

    const qr = result[0].qr_code;

    if (!qr) {
      return res.status(400).json({
        message: "QR code belum tersedia"
      });
    }

    const base64Data = qr.replace(/^data:image\/png;base64,/, "");

    const img = Buffer.from(base64Data, "base64");

    res.setHeader("Content-Type", "image/png");

    res.send(img);

  });

};

// =============================
// SCAN QR
// =============================
exports.scanQR = (req, res) => {
  try {
    let { kode_barang } = req.body;

    if (!kode_barang) {
      return res.status(400).json({
        message: "kode_barang wajib dikirim"
      });
    }

    kode_barang = kode_barang.trim();

    console.log("SCAN MASUK:", kode_barang);

    const sql = `
  SELECT * FROM barang WHERE kode_barang = ? AND is_deleted = 0
`;

    db.query(sql, [kode_barang], (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      if (result.length === 0) {
        return res.status(404).json({
          message: "Barang tidak ditemukan"
        });
      }

      res.json({
        message: "Scan berhasil",
        data: result[0]
      });

    });

  } catch (err) {
    res.status(500).json(err);
  }
};

// =============================
// LACAK ANTREAN ORDER (PENDING)
// =============================
exports.getPendingOrdersByBarang = (req, res) => {
  const barangId = req.params.id;

  const sql = `
    SELECT 
      p.nomor_pengajuan,
      p.id as pengajuan_id,
      u.nama as pemohon,
      pd.jumlah,
      p.status,
      p.tanggal_pengajuan,
      p.urgensi
    FROM pengajuan_detail pd
    JOIN pengajuan p ON pd.pengajuan_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE pd.barang_id = ? 
    AND p.status IN ('pending_asisten_manager', 'pending_manager', 'pending_gudang')
    ORDER BY p.tanggal_pengajuan ASC
  `;

  db.query(sql, [barangId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};
