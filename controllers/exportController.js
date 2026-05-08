const db = require("../config/db");
const PDFDocument = require("pdfkit");
const excel = require("exceljs");

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
const drawPDFHeader = (doc, title, period = "") => {
  doc.fontSize(14).font("Helvetica-Bold").text(ORG.name, { align: "center" });
  doc.fontSize(8).font("Helvetica").text(ORG.address, { align: "center" });
  doc.text(`Telp: ${ORG.phone} | Email: ${ORG.email}`, { align: "center" });
  doc.moveDown(1);
  doc.strokeColor("#000000").lineWidth(1).moveTo(40, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(1.5);
  doc.fontSize(12).font("Helvetica-Bold").text(title, { align: "center", underline: true });
  if (period) doc.fontSize(9).font("Helvetica").text(`Periode: ${period}`, { align: "center" });
  doc.moveDown(2);
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
      doc.text(new Date(item.tanggal_pengajuan).toLocaleDateString("id-ID", {day:'2-digit', month:'2-digit'}), 465, startY + 8, { width: 50, align: "center" });
      doc.font("Helvetica-Bold").text(item.status.toUpperCase(), 515, startY + 8, { width: 45, align: "center" });
      doc.y = startY + rowHeight;
    });
    drawPDFSignature(doc);
    doc.end();
  });
};

// ==========================================
// EXPORT BARANG KELUAR (PDF)
// ==========================================
exports.exportBarangKeluarPDF = async (req, res) => {
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

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_keluar.pdf");
    doc.pipe(res);
    drawPDFHeader(doc, "LAPORAN PENGELUARAN BARANG", `${start} - ${end}`);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      [70, 250, 400, 480].forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").text("NO", 40, yPos + 6, { width: 30, align: "center" });
      doc.text("NAMA BARANG", 70, yPos + 6, { width: 180, align: "center" });
      doc.text("PENERIMA / UNIT", 250, yPos + 6, { width: 150, align: "center" });
      doc.text("JUMLAH", 400, yPos + 6, { width: 80, align: "center" });
      doc.text("TANGGAL", 480, yPos + 6, { width: 80, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    rows.forEach((item, index) => {
      const rowHeight = 25;
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENGELUARAN BARANG", ""); drawTableHeader(doc.y); }
      const startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      [70, 250, 400, 480].forEach(x => doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke());
      doc.fontSize(8).font("Helvetica").text(index + 1, 40, startY + 8, { width: 30, align: "center" });
      doc.text(item.nama_barang, 75, startY + 8, { width: 170 });
      doc.text(`${item.pemohon || "-"} / ${item.unit || "-"}`, 255, startY + 8, { width: 140 });
      doc.text(`${item.jumlah} ${item.satuan}`, 400, startY + 8, { width: 80, align: "center" });
      doc.text(new Date(item.tanggal).toLocaleDateString("id-ID"), 480, startY + 8, { width: 80, align: "center" });
      doc.y = startY + rowHeight;
    });
    drawPDFSignature(doc);
    doc.end();
  });
};

// ==========================================
// EXPORT STOK (PDF)
// ==========================================
exports.exportStokPDF = (req, res) => {
  const sql = "SELECT kode_barang, nama_barang, satuan, stok FROM barang WHERE is_deleted = 0 ORDER BY nama_barang ASC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_stok.pdf");
    doc.pipe(res);
    drawPDFHeader(doc, "LAPORAN STOK BARANG GUDANG");

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
    drawPDFSignature(doc);
    doc.end();
  });
};

// ==========================================
// EXPORT BARANG MASUK (PDF)
// ==========================================
exports.exportBarangMasukPDF = (req, res) => {
  const { start, end } = req.query;
  const sql = `SELECT b.nama_barang, sm.jumlah, b.satuan, sm.tanggal, sm.keterangan FROM stok_masuk sm JOIN barang b ON sm.barang_id = b.id WHERE DATE(sm.tanggal) BETWEEN ? AND ? ORDER BY sm.tanggal DESC`;
  db.query(sql, [start, end], (err, rows) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_masuk.pdf");
    doc.pipe(res);
    drawPDFHeader(doc, "LAPORAN PENERIMAAN BARANG (MASUK)", `${start} - ${end}`);

    const drawTableHeader = (yPos) => {
      doc.strokeColor("#000000").lineWidth(0.7).rect(40, yPos, 520, 20).stroke();
      [70, 250, 330, 410].forEach(x => doc.moveTo(x, yPos).lineTo(x, yPos + 20).stroke());
      doc.fontSize(8).font("Helvetica-Bold").text("NO", 40, yPos + 6, { width: 30, align: "center" });
      doc.text("NAMA BARANG", 70, yPos + 6, { width: 180, align: "center" });
      doc.text("JUMLAH", 250, yPos + 6, { width: 80, align: "center" });
      doc.text("TGL", 330, yPos + 6, { width: 80, align: "center" });
      doc.text("KETERANGAN", 410, yPos + 6, { width: 150, align: "center" });
      doc.y = yPos + 20;
    };

    drawTableHeader(doc.y);
    rows.forEach((item, index) => {
      const rowHeight = 25;
      if (doc.y + rowHeight > 700) { doc.addPage(); drawPDFHeader(doc, "LAPORAN PENERIMAAN BARANG (MASUK)", ""); drawTableHeader(doc.y); }
      const startY = doc.y;
      doc.strokeColor("#000000").lineWidth(0.5).rect(40, startY, 520, rowHeight).stroke();
      [70, 250, 330, 410].forEach(x => doc.moveTo(x, startY).lineTo(x, startY + rowHeight).stroke());
      doc.fontSize(8).font("Helvetica").text(index + 1, 40, startY + 8, { width: 30, align: "center" });
      doc.text(item.nama_barang, 75, startY + 8, { width: 170 });
      doc.text(`${item.jumlah} ${item.satuan}`, 250, startY + 8, { width: 80, align: "center" });
      doc.text(new Date(item.tanggal).toLocaleDateString("id-ID"), 330, startY + 8, { width: 80, align: "center" });
      doc.text(item.keterangan || "-", 415, startY + 8, { width: 140 });
      doc.y = startY + rowHeight;
    });
    drawPDFSignature(doc);
    doc.end();
  });
};

// Excel Stubs (Jika dibutuhkan kedepannya)
exports.exportBarangKeluarExcel = (req, res) => { res.status(501).send("Excel export not implemented yet in this version."); };
exports.exportBarangMasukExcel = (req, res) => { res.status(501).send("Excel export not implemented yet."); };
exports.exportStokExcel = (req, res) => { res.status(501).send("Excel export not implemented yet."); };
exports.exportPengajuanExcel = (req, res) => { res.status(501).send("Excel export not implemented yet."); };
