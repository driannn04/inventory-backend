const db = require("../config/db");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

// Helper to get settings for PDF headers
const getOrgSettings = () => {
  return new Promise((resolve) => {
    db.query("SELECT setting_key, setting_value FROM system_settings WHERE category = 'org'", (err, result) => {
      if (err) return resolve({});
      const settings = {};
      result.forEach(row => settings[row.setting_key] = row.setting_value);
      resolve(settings);
    });
  });
};

const drawPDFHeader = (doc, org, title, period = "") => {
  // Brand Header
  doc.fontSize(20).fillColor("#0284c7").text(org.org_name || "PDAM TIRTA PAKUAN", { align: "center", characterSpacing: 1 });
  doc.fontSize(10).fillColor("#64748b").text(org.org_address || "", { align: "center" });
  doc.text(`Telp: ${org.org_phone || "-"} | Email: ${org.org_email || "-"}`, { align: "center" });
  
  doc.moveDown(1);
  doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1.5);

  // Report Title
  doc.fontSize(16).fillColor("#1e293b").text(title, { align: "center", underline: true });
  if (period) {
    doc.fontSize(10).fillColor("#94a3b8").text(`Periode: ${period}`, { align: "center" });
  }
  doc.moveDown(2);
};

// ==========================================
// EXCEL: BARANG KELUAR
// ==========================================
exports.exportBarangKeluarExcel = (req, res) => {
  const { start, end } = req.query;
  let sql = `
    SELECT b.nama_barang as 'Nama Barang', sk.jumlah as 'Jumlah', sk.tanggal as 'Tanggal'
    FROM stok_keluar sk
    JOIN barang b ON sk.barang_id=b.id
  `;
  const params = [];

  if (start && end) {
    sql += " WHERE DATE(sk.tanggal) BETWEEN ? AND ?";
    params.push(start, end);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangKeluar");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_keluar.xlsx");
    res.send(buffer);
  });
};

// ==========================================
// PDF: BARANG KELUAR
// ==========================================
exports.exportBarangKeluarPDF = async (req, res) => {
  const { start, end } = req.query;
  const org = await getOrgSettings();
  
  let sql = `
    SELECT b.nama_barang, sk.jumlah, sk.tanggal
    FROM stok_keluar sk
    JOIN barang b ON sk.barang_id=b.id
  `;
  const params = [];

  if (start && end) {
    sql += " WHERE DATE(sk.tanggal) BETWEEN ? AND ?";
    params.push(start, end);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_keluar.pdf");
    doc.pipe(res);

    drawPDFHeader(doc, org, "LAPORAN BARANG KELUAR", start && end ? `${start} - ${end}` : "");

    // Table Header
    doc.fontSize(11).fillColor("#475569").text("Nama Barang", 50, doc.y, { width: 300 });
    doc.text("Jumlah", 350, doc.y, { width: 100 });
    doc.text("Tanggal", 450, doc.y, { width: 100 });
    doc.moveDown(0.5);
    doc.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Rows
    result.forEach(item => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID");
      doc.fontSize(10).fillColor("#1e293b").text(item.nama_barang, 50, doc.y, { width: 300 });
      doc.text(`${item.jumlah} Pcs`, 350, doc.y - 12, { width: 100 });
      doc.text(tgl, 450, doc.y - 12, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.end();
  });
};

// ==========================================
// EXCEL: BARANG MASUK
// ==========================================
exports.exportBarangMasukExcel = (req, res) => {
  const { start, end } = req.query;
  let sql = `
    SELECT b.nama_barang as 'Nama Barang', sm.jumlah as 'Jumlah', sm.tanggal as 'Tanggal'
    FROM stok_masuk sm
    JOIN barang b ON sm.barang_id=b.id
  `;
  const params = [];

  if (start && end) {
    sql += " WHERE DATE(sm.tanggal) BETWEEN ? AND ?";
    params.push(start, end);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangMasuk");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_masuk.xlsx");
    res.send(buffer);
  });
};

// ==========================================
// PDF: BARANG MASUK
// ==========================================
exports.exportBarangMasukPDF = async (req, res) => {
  const { start, end } = req.query;
  const org = await getOrgSettings();

  let sql = `
    SELECT b.nama_barang, sm.jumlah, sm.tanggal
    FROM stok_masuk sm
    JOIN barang b ON sm.barang_id=b.id
  `;
  const params = [];

  if (start && end) {
    sql += " WHERE DATE(sm.tanggal) BETWEEN ? AND ?";
    params.push(start, end);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_barang_masuk.pdf");
    doc.pipe(res);

    drawPDFHeader(doc, org, "LAPORAN BARANG MASUK", start && end ? `${start} - ${end}` : "");

    // Table
    doc.fontSize(11).fillColor("#475569").text("Nama Barang", 50, doc.y, { width: 300 });
    doc.text("Jumlah", 350, doc.y, { width: 100 });
    doc.text("Tanggal", 450, doc.y, { width: 100 });
    doc.moveDown(0.5);
    doc.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    result.forEach(item => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID");
      doc.fontSize(10).fillColor("#1e293b").text(item.nama_barang, 50, doc.y, { width: 300 });
      doc.text(`${item.jumlah} Pcs`, 350, doc.y - 12, { width: 100 });
      doc.text(tgl, 450, doc.y - 12, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.end();
  });
};

// ==========================================
// EXCEL: STOK SAAT INI
// ==========================================
exports.exportStokExcel = (req, res) => {
  const sql = "SELECT kode_barang as 'Kode', nama_barang as 'Nama Barang', stok as 'Stok' FROM barang";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    const worksheet = XLSX.utils.json_to_sheet(result);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_stok.xlsx");
    res.send(buffer);
  });
};

// ==========================================
// PDF: STOK SAAT INI
// ==========================================
exports.exportStokPDF = async (req, res) => {
  const org = await getOrgSettings();
  const sql = "SELECT kode_barang, nama_barang, stok FROM barang";
  
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_stok.pdf");
    doc.pipe(res);

    drawPDFHeader(doc, org, "LAPORAN STOK SAAT INI");

    // Table
    doc.fontSize(11).fillColor("#475569").text("SKU / Kode", 50, doc.y, { width: 120 });
    doc.text("Nama Barang", 170, doc.y, { width: 280 });
    doc.text("Stok", 450, doc.y, { width: 100 });
    doc.moveDown(0.5);
    doc.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    result.forEach(item => {
      doc.fontSize(10).fillColor("#1e293b").text(item.kode_barang, 50, doc.y, { width: 120 });
      doc.text(item.nama_barang, 170, doc.y - 12, { width: 280 });
      doc.text(`${item.stok} Pcs`, 450, doc.y - 12, { width: 100 });
      doc.moveDown(0.5);
    });

    doc.end();
  });
};