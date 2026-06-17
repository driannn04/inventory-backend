const db = require("../config/db");
const PDFDocument = require("pdfkit");
const excel = require("exceljs");
const { logActivity } = require("../utils/activityLogger");

const ORG = {
  name: "PDAM TIRTA PAKUAN KOTA BOGOR",
  address: "Jl. Siliwangi No.121, RT.01/RW.01, Sukasari, Kec. Bogor Tim., Kota Bogor",
  phone: "(0251) 8324111",
  email: "pdam@tirtapakuan.co.id",
  // Penandatangan 1 (Kanan - Mengetahui)
  manager_name: "ABDULLAH ANDRIAN S",
  manager_title: "Manajer Logistik",
  manager_nip: "19850101 201001 1 001",
  // Penandatangan 2 (Kiri - Pemeriksa)
  asman_name: "NAMA ASISTEN MANAJER",
  asman_title: "Asisten Manajer Inventaris",
  asman_nip: "19880202 201202 2 002",
  logo: "pdam-logo.png"
};

// HELPER: DRAW PDF HEADER
const drawPDFHeader = (doc, title, period = "", bagian = "Semua Bagian") => {
  doc.moveDown(1.5);
  const startX = 40;
  const currentY = doc.y;
  
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Periode Tanggal Laporan", startX, currentY);
  doc.text(":", startX + 130, currentY);
  doc.font("Helvetica").text(period || "-", startX + 140, currentY);
  
  doc.font("Helvetica-Bold").text("Tanggal Cetak", startX, currentY + 15);
  doc.text(":", startX + 130, currentY + 15);
  const printDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  doc.font("Helvetica").text(printDate, startX + 140, currentY + 15);
  
  doc.font("Helvetica-Bold").text("Bagian", startX, currentY + 30);
  doc.text(":", startX + 130, currentY + 30);
  doc.font("Helvetica").text(bagian, startX + 140, currentY + 30);
  
  doc.moveDown(3);
};

// HELPER: DRAW SIGNATURE (2 KOLOM)
const drawPDFSignature = (doc) => {
  if (doc.y > 600) doc.addPage();
  const signY = doc.y + 40;
  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  doc.fontSize(8).font("Helvetica").text("Dicetak pada: " + new Date().toLocaleString("id-ID"), 40, signY - 20);
  doc.fontSize(9).font("Helvetica").text(`Bogor, ${dateStr}`, 350, signY, { align: "center" });

  // KOLOM 1: PEMERIKSA (KIRI)
  doc.text("Memeriksa,", 70, signY + 14, { width: 180, align: "center" });
  doc.font("Helvetica-Bold").text(ORG.asman_title + ",", 70, signY + 26, { width: 180, align: "center" });
  doc.moveDown(4);
  doc.font("Helvetica-Bold").text(ORG.asman_name, 70, signY + 80, { width: 180, align: "center" });
  doc.fontSize(8).font("Helvetica").text(`NIP. ${ORG.asman_nip}`, 70, signY + 92, { width: 180, align: "center" });

  // KOLOM 2: MENGETAHUI (KANAN)
  doc.fontSize(9).text("Mengetahui,", 350, signY + 14, { width: 180, align: "center" });
  doc.font("Helvetica-Bold").text(ORG.manager_title + ",", 350, signY + 26, { width: 180, align: "center" });
  doc.moveDown(4);
  doc.font("Helvetica-Bold").text(ORG.manager_name, 350, signY + 80, { width: 180, align: "center" });
  doc.fontSize(8).font("Helvetica").text(`NIP. ${ORG.manager_nip}`, 350, signY + 92, { width: 180, align: "center" });
};

// ==========================================
// EXPORT RIWAYAT PENGAJUAN (PDF)
// ==========================================
exports.exportPengajuanPDF = async (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept } = req.user;

  let sql = `
    SELECT p.nomor_pengajuan, p.tanggal_pengajuan, p.status, u.nama as pemohon, sd.nama_sub as unit,
           b.nama_barang, pd.jumlah, b.satuan
    FROM pengajuan p
    JOIN pengajuan_detail pd ON p.id = pd.pengajuan_id
    JOIN barang b ON pd.barang_id = b.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE DATE(p.tanggal_pengajuan) BETWEEN ? AND ?
  `;
  const params = [start, end];
  if (role === "manager") { sql += " AND u.id_dept = ?"; params.push(id_dept); }
  else if (role === "asisten_manager") { sql += " AND u.id_subdept = ?"; params.push(id_subdept); }
  sql += " ORDER BY p.tanggal_pengajuan DESC, p.nomor_pengajuan ASC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.nomor_pengajuan]) {
        acc[row.nomor_pengajuan] = { ...row, barang_list: [] };
      }
      acc[row.nomor_pengajuan].barang_list.push(`${row.nama_barang} (${row.jumlah} ${row.satuan})`);
      return acc;
    }, {});
    const result = Object.values(grouped);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_pengajuan.pdf");
    doc.pipe(res);
    drawPDFHeader(doc, "LAPORAN RIWAYAT PENGAJUAN BARANG", `${start} - ${end}`);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      const cols = [60, 155, 275, 465, 515];
      cols.forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").fillColor("#000000");
      doc.text("NO", 40, yPos + 6, { width: 20, align: "center" });
      doc.text("NO. PENGAJUAN", 65, yPos + 6, { width: 85, align: "center" });
      doc.text("PEMOHON / UNIT", 160, yPos + 6, { width: 110, align: "center" });
      doc.text("DAFTAR BARANG", 280, yPos + 6, { width: 180, align: "center" });
      doc.text("TGL", 465, yPos + 6, { width: 50, align: "center" });
      doc.text("STATUS", 515, yPos + 6, { width: 45, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    result.forEach((item, index) => {
      const barangText = item.barang_list.join("\n");
      const textHeight = doc.heightOfString(barangText, { width: 180 });
      const rowHeight = Math.max(textHeight + 15, 30);
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN RIWAYAT PENGAJUAN BARANG", ""); drawTableHeader(doc.y); }
      const startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      [60, 155, 275, 465, 515].forEach(x => doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke());
      doc.fontSize(7.5).font("Helvetica").fillColor("#000000");
      doc.text(index + 1, 40, startY + 8, { width: 20, align: "center" });
      doc.text(item.nomor_pengajuan, 65, startY + 8, { width: 85, align: "center" });
      doc.font("Helvetica-Bold").text(item.pemohon, 160, startY + 5, { width: 110 });
      doc.font("Helvetica").fontSize(7).text(item.unit || '-', 160, startY + 15, { width: 110 });
      doc.fontSize(7.5).font("Helvetica").text(barangText, 280, startY + 8, { width: 180 });
      doc.text(new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit' }), 465, startY + 8, { width: 50, align: "center" });
      doc.font("Helvetica-Bold").text(item.status.toUpperCase(), 515, startY + 8, { width: 45, align: "center" });
      doc.y = startY + rowHeight;
    });
    drawPDFSignature(doc);
    doc.end();
    logActivity(req.user.id, "EXPORT", "PENGAJUAN", `Mengekspor riwayat pengajuan ke PDF`, { req });
  });
};

// ==========================================
// EXPORT BARANG KELUAR (PDF)
// ==========================================
exports.exportBarangKeluarPDF = (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept, id: userId } = req.user;

  const userSql = `
    SELECT r.nama_role, d.nama_dept, sd.nama_sub
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE u.id = ?
  `;

  db.query(userSql, [userId], (userErr, userRows) => {
    let bagian = "Semua Bagian";
    if (!userErr && userRows && userRows.length > 0) {
      const user = userRows[0];
      if (user.nama_role === "asisten_manager") {
        bagian = user.nama_sub || "Semua Bagian";
      } else if (user.nama_role === "manager") {
        bagian = user.nama_dept || "Semua Bagian";
      }
    }

    let sql = `
      SELECT b.kode_barang, b.nama_barang, sk.jumlah, b.satuan, sk.tanggal, u.nama as pemohon, sd.nama_sub as unit
      FROM stok_keluar sk
      JOIN barang b ON sk.barang_id = b.id
      LEFT JOIN pengajuan p ON sk.pengajuan_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
      WHERE DATE(sk.tanggal) BETWEEN ? AND ?
    `;
    const params = [start, end];
    if (role === "manager") { sql += " AND u.id_dept = ?"; params.push(id_dept); }
    else if (role === "asisten_manager") { sql += " AND u.id_subdept = ?"; params.push(id_subdept); }
    sql += " ORDER BY sk.tanggal DESC";

    db.query(sql, params, (err, rows) => {
      if (err) return res.status(500).json(err);
      
      // Group by Date
      const grouped = rows.reduce((acc, row) => {
        const dateKey = new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(row);
        return acc;
      }, {});

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_keluar.pdf");
      doc.pipe(res);
      
      let periodStr = "-";
      if(start && end) {
         periodStr = `${new Date(start).toLocaleDateString('id-ID')} s/d ${new Date(end).toLocaleDateString('id-ID')}`;
      }
      
      drawPDFHeader(doc, "LAPORAN PENGELUARAN BARANG", periodStr, bagian);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      // NO(30), KODE(110), NAMA(140), SATUAN(60), JUMLAH(60), PENERIMA(120)
      [70, 180, 320, 380, 440].forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").text("NO", 40, yPos + 6, { width: 30, align: "center" });
      doc.text("KODE BARANG", 70, yPos + 6, { width: 110, align: "center" });
      doc.text("NAMA BARANG", 180, yPos + 6, { width: 140, align: "center" });
      doc.text("SATUAN", 320, yPos + 6, { width: 60, align: "center" });
      doc.text("JUMLAH", 380, yPos + 6, { width: 60, align: "center" });
      doc.text("PENERIMA / UNIT", 440, yPos + 6, { width: 80, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    
    let groupIndex = 1;
    for (const [dateText, items] of Object.entries(grouped)) {
      const rowHeight = 20;
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENGELUARAN BARANG", periodStr, bagian); drawTableHeader(doc.y); }
      let startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      doc.moveTo(70, startY).lineTo(70, startY + rowHeight).stroke();
      
      doc.fontSize(8).font("Helvetica-Bold").text(groupIndex, 40, startY + 6, { width: 30, align: "center" });
      doc.text(`Tanggal ${dateText}`, 75, startY + 6, { width: 440 });
      doc.y = startY + rowHeight;
      groupIndex++;
      
      items.forEach((item) => {
         const infoText = `${item.pemohon || "-"} / ${item.unit || "-"}`;
         const textHeight = Math.max(doc.heightOfString(item.nama_barang, { width: 140 }), doc.heightOfString(infoText, { width: 80 }));
         const itemRowHeight = Math.max(textHeight + 10, 20);
         
         if (doc.y + itemRowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENGELUARAN BARANG", periodStr, bagian); drawTableHeader(doc.y); }
         let iY = doc.y;
         doc.strokeColor("#000000").lineWidth(0.5).rect(40, iY, 520, itemRowHeight).stroke();
         [70, 180, 320, 380, 440].forEach(x => doc.moveTo(x, iY).lineTo(x, iY + itemRowHeight).stroke());
         
         doc.fontSize(8).font("Helvetica").text(item.kode_barang || "-", 75, iY + 6, { width: 100 });
         doc.text(item.nama_barang, 185, iY + 6, { width: 130 });
         doc.text(item.satuan, 320, iY + 6, { width: 60, align: "center" });
         doc.text(item.jumlah, 380, iY + 6, { width: 60, align: "center" });
         doc.text(infoText, 445, iY + 6, { width: 70 });
         
         doc.y = iY + itemRowHeight;
      });
    }
    doc.end();
    logActivity(req.user.id, "EXPORT", "STOK KELUAR", `Mengekspor riwayat pengeluaran ke PDF`, { req });
  });
  });
};

// ==========================================
// EXPORT STOK (PDF)
// ==========================================
exports.exportStokPDF = (req, res) => {
  const { id: userId } = req.user;

  const userSql = `
    SELECT r.nama_role, d.nama_dept, sd.nama_sub
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE u.id = ?
  `;

  db.query(userSql, [userId], (userErr, userRows) => {
    let bagian = "Semua Bagian";
    if (!userErr && userRows && userRows.length > 0) {
      const user = userRows[0];
      if (user.nama_role === "asisten_manager") {
        bagian = user.nama_sub || "Semua Bagian";
      } else if (user.nama_role === "manager") {
        bagian = user.nama_dept || "Semua Bagian";
      }
    }

    const sql = "SELECT kode_barang, nama_barang, satuan, stok FROM barang WHERE is_deleted = 0 ORDER BY nama_barang ASC";
    db.query(sql, (err, rows) => {
      if (err) return res.status(500).json(err);
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader("Content-Disposition", "attachment; filename=laporan_stok.pdf");
      doc.pipe(res);
      drawPDFHeader(doc, "LAPORAN STOK BARANG GUDANG", "", bagian);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      [70, 160, 440, 500].forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").text("NO", 40, yPos + 6, { width: 30, align: "center" });
      doc.text("KODE", 70, yPos + 6, { width: 90, align: "center" });
      doc.text("NAMA BARANG", 160, yPos + 6, { width: 280, align: "center" });
      doc.text("STOK", 440, yPos + 6, { width: 60, align: "center" });
      doc.text("SATUAN", 500, yPos + 6, { width: 60, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    rows.forEach((item, index) => {
      const rowHeight = 20;
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN STOK BARANG GUDANG"); drawTableHeader(doc.y); }
      const startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      [70, 160, 440, 500].forEach(x => doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke());
      doc.fontSize(8).font("Helvetica").text(index + 1, 40, startY + 6, { width: 30, align: "center" });
      doc.text(item.kode_barang, 75, startY + 6, { width: 80 });
      doc.text(item.nama_barang, 165, startY + 6, { width: 270 });
      doc.font("Helvetica-Bold").text(item.stok, 440, startY + 6, { width: 60, align: "center" });
      doc.font("Helvetica").text(item.satuan, 500, startY + 6, { width: 60, align: "center" });
      doc.y = startY + rowHeight;
    });
    doc.end();
    logActivity(req.user.id, "EXPORT", "STOK", `Mengekspor laporan stok ke PDF`, { req });
  });
  });
};

// ==========================================
// EXPORT BARANG MASUK (PDF)
// ==========================================
exports.exportBarangMasukPDF = (req, res) => {
  const { start, end } = req.query;
  const { id: userId } = req.user;

  const userSql = `
    SELECT r.nama_role, d.nama_dept, sd.nama_sub
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.id_dept = d.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE u.id = ?
  `;

  db.query(userSql, [userId], (userErr, userRows) => {
    let bagian = "Semua Bagian";
    if (!userErr && userRows && userRows.length > 0) {
      const user = userRows[0];
      if (user.nama_role === "asisten_manager") {
        bagian = user.nama_sub || "Semua Bagian";
      } else if (user.nama_role === "manager") {
        bagian = user.nama_dept || "Semua Bagian";
      }
    }

    const sql = `SELECT b.kode_barang, b.nama_barang, sm.jumlah, b.satuan, sm.tanggal, sm.keterangan FROM stok_masuk sm JOIN barang b ON sm.barang_id = b.id WHERE DATE(sm.tanggal) BETWEEN ? AND ? ORDER BY sm.tanggal DESC`;
    db.query(sql, [start, end], (err, rows) => {
      if (err) return res.status(500).json(err);
      
      // Group by Date
      const grouped = rows.reduce((acc, row) => {
        const dateKey = new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(row);
        return acc;
      }, {});

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_masuk.pdf");
      doc.pipe(res);
      
      let periodStr = "-";
      if(start && end) {
         periodStr = `${new Date(start).toLocaleDateString('id-ID')} s/d ${new Date(end).toLocaleDateString('id-ID')}`;
      }
      
      drawPDFHeader(doc, "LAPORAN PENERIMAAN BARANG (MASUK)", periodStr, bagian);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      // NO(30), KODE(110), NAMA(140), SATUAN(60), JUMLAH(60), KETERANGAN(120)
      [70, 180, 320, 380, 440].forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").text("NO", 40, yPos + 6, { width: 30, align: "center" });
      doc.text("KODE BARANG", 70, yPos + 6, { width: 110, align: "center" });
      doc.text("NAMA BARANG", 180, yPos + 6, { width: 140, align: "center" });
      doc.text("SATUAN", 320, yPos + 6, { width: 60, align: "center" });
      doc.text("JUMLAH", 380, yPos + 6, { width: 60, align: "center" });
      doc.text("KETERANGAN", 440, yPos + 6, { width: 90, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    
    let groupIndex = 1;
    for (const [dateText, items] of Object.entries(grouped)) {
      const rowHeight = 20;
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENERIMAAN BARANG (MASUK)", periodStr, bagian); drawTableHeader(doc.y); }
      let startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      doc.moveTo(70, startY).lineTo(70, startY + rowHeight).stroke();
      
      doc.fontSize(8).font("Helvetica-Bold").text(groupIndex, 40, startY + 6, { width: 30, align: "center" });
      doc.text(`Tanggal ${dateText}`, 75, startY + 6, { width: 440 });
      doc.y = startY + rowHeight;
      groupIndex++;
      
      items.forEach((item) => {
         const textHeight = Math.max(doc.heightOfString(item.nama_barang, { width: 140 }), doc.heightOfString(item.keterangan || "-", { width: 80 }));
         const itemRowHeight = Math.max(textHeight + 10, 20);
         
         if (doc.y + itemRowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENERIMAAN BARANG (MASUK)", periodStr, bagian); drawTableHeader(doc.y); }
         let iY = doc.y;
         doc.strokeColor("#000000").lineWidth(0.5).rect(40, iY, 520, itemRowHeight).stroke();
         [70, 180, 320, 380, 440].forEach(x => doc.moveTo(x, iY).lineTo(x, iY + itemRowHeight).stroke());
         
         doc.fontSize(8).font("Helvetica").text(item.kode_barang || "-", 75, iY + 6, { width: 100 });
         doc.text(item.nama_barang, 185, iY + 6, { width: 130 });
         doc.text(item.satuan, 320, iY + 6, { width: 60, align: "center" });
         doc.text(item.jumlah, 380, iY + 6, { width: 60, align: "center" });
         doc.text(item.keterangan || "-", 445, iY + 6, { width: 70 });
         
         doc.y = iY + itemRowHeight;
      });
    }
    doc.end();
    logActivity(req.user.id, "EXPORT", "STOK MASUK", `Mengekspor riwayat penerimaan ke PDF`, { req });
  });
  });
};

// ==========================================
// EXPORT EXCEL IMPLEMENTATIONS
// ==========================================

exports.exportBarangKeluarExcel = async (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept } = req.user;

  let sql = `
    SELECT b.nama_barang, sk.jumlah, b.satuan, sk.tanggal, u.nama as pemohon, sd.nama_sub as unit
    FROM stok_keluar sk
    JOIN barang b ON sk.barang_id = b.id
    LEFT JOIN pengajuan p ON sk.pengajuan_id = p.id
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE DATE(sk.tanggal) BETWEEN ? AND ?
  `;
  const params = [start, end];
  if (role === "manager") { sql += " AND u.id_dept = ?"; params.push(id_dept); }
  else if (role === "asisten_manager") { sql += " AND u.id_subdept = ?"; params.push(id_subdept); }
  sql += " ORDER BY sk.tanggal DESC";

  db.query(sql, params, async (err, rows) => {
    if (err) return res.status(500).json(err);

    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Barang Keluar");

    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Barang", key: "nama_barang", width: 30 },
      { header: "Penerima", key: "penerima", width: 20 },
      { header: "Unit", key: "unit", width: 25 },
      { header: "Jumlah", key: "jumlah", width: 10 },
      { header: "Satuan", key: "satuan", width: 10 },
      { header: "Tanggal", key: "tanggal", width: 15 }
    ];

    rows.forEach((r, i) => {
      sheet.addRow({
        no: i + 1,
        nama_barang: r.nama_barang,
        penerima: r.pemohon || "-",
        unit: r.unit || "-",
        jumlah: r.jumlah,
        satuan: r.satuan,
        tanggal: new Date(r.tanggal).toLocaleDateString("id-ID")
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=barang_keluar.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    logActivity(req.user.id, "EXPORT", "STOK KELUAR", `Mengekspor riwayat pengeluaran ke Excel`, { req });
  });
};

exports.exportBarangMasukExcel = async (req, res) => {
  const { start, end } = req.query;
  const sql = `SELECT b.nama_barang, sm.jumlah, b.satuan, sm.tanggal, sm.keterangan FROM stok_masuk sm JOIN barang b ON sm.barang_id = b.id WHERE DATE(sm.tanggal) BETWEEN ? AND ? ORDER BY sm.tanggal DESC`;

  db.query(sql, [start, end], async (err, rows) => {
    if (err) return res.status(500).json(err);
    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Barang Masuk");
    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Barang", key: "nama_barang", width: 35 },
      { header: "Jumlah", key: "jumlah", width: 10 },
      { header: "Satuan", key: "satuan", width: 10 },
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Keterangan", key: "keterangan", width: 30 }
    ];
    rows.forEach((r, i) => {
      sheet.addRow({ no: i + 1, nama_barang: r.nama_barang, jumlah: r.jumlah, satuan: r.satuan, tanggal: new Date(r.tanggal).toLocaleDateString("id-ID"), keterangan: r.keterangan || "-" });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=barang_masuk.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    logActivity(req.user.id, "EXPORT", "STOK MASUK", `Mengekspor riwayat penerimaan ke Excel`, { req });
  });
};

exports.exportStokExcel = async (req, res) => {
  const sql = "SELECT kode_barang, nama_barang, satuan, stok FROM barang WHERE is_deleted = 0 ORDER BY nama_barang ASC";
  db.query(sql, async (err, rows) => {
    if (err) return res.status(500).json(err);
    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Stok Barang");
    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Kode", key: "kode", width: 15 },
      { header: "Nama Barang", key: "nama_barang", width: 40 },
      { header: "Stok", key: "stok", width: 10 },
      { header: "Satuan", key: "satuan", width: 10 }
    ];
    rows.forEach((r, i) => {
      sheet.addRow({ no: i + 1, kode: r.kode_barang, nama_barang: r.nama_barang, stok: r.stok, satuan: r.satuan });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=stok_barang.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    logActivity(req.user.id, "EXPORT", "STOK", `Mengekspor laporan stok ke Excel`, { req });
  });
};

exports.exportPengajuanExcel = async (req, res) => {
  const { start, end } = req.query;
  const { role, id_dept, id_subdept } = req.user;
  let sql = `
    SELECT p.nomor_pengajuan, p.tanggal_pengajuan, p.status, u.nama as pemohon, sd.nama_sub as unit,
           b.nama_barang, pd.jumlah, b.satuan
    FROM pengajuan p
    JOIN pengajuan_detail pd ON p.id = pd.pengajuan_id
    JOIN barang b ON pd.barang_id = b.id
    JOIN users u ON p.user_id = u.id
    LEFT JOIN sub_departments sd ON u.id_subdept = sd.id
    WHERE DATE(p.tanggal_pengajuan) BETWEEN ? AND ?
  `;
  const params = [start, end];
  if (role === "manager") { sql += " AND u.id_dept = ?"; params.push(id_dept); }
  else if (role === "asisten_manager") { sql += " AND u.id_subdept = ?"; params.push(id_subdept); }
  sql += " ORDER BY p.tanggal_pengajuan DESC";

  db.query(sql, params, async (err, rows) => {
    if (err) return res.status(500).json(err);
    const workbook = new excel.Workbook();
    const sheet = workbook.addWorksheet("Pengajuan");
    sheet.columns = [
      { header: "No Pengajuan", key: "nomor", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 15 },
      { header: "Pemohon", key: "pemohon", width: 20 },
      { header: "Unit", key: "unit", width: 20 },
      { header: "Barang", key: "barang", width: 30 },
      { header: "Jumlah", key: "jumlah", width: 10 },
      { header: "Status", key: "status", width: 15 }
    ];
    rows.forEach(r => {
      sheet.addRow({
        nomor: r.nomor_pengajuan,
        tanggal: new Date(r.tanggal_pengajuan).toLocaleDateString("id-ID"),
        pemohon: r.pemohon,
        unit: r.unit || "-",
        barang: r.nama_barang,
        jumlah: `${r.jumlah} ${r.satuan}`,
        status: r.status
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=riwayat_pengajuan.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    logActivity(req.user.id, "EXPORT", "PENGAJUAN", `Mengekspor riwayat pengajuan ke Excel`, { req });
  });
};
