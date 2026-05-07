const db = require("../config/db");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

// Helper to get settings for PDF headers
const getOrgSettings = () => {
  return new Promise((resolve) => {
    db.query("SELECT setting_key, setting_value FROM system_settings", (err, result) => {
      if (err) return resolve({});
      const settings = {};
      result.forEach(row => settings[row.setting_key] = row.setting_value);
      resolve(settings);
    });
  });
};

const fs = require("fs");
const path = require("path");

const drawPDFHeader = (doc, org, title, period = "") => {
  // --- KOP SURAT RESMI PDAM ---
  const logoPath = org.app_logo_report ? path.join(__dirname, "..", org.app_logo_report) : null;
  
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 60 });
  } else {
    doc.rect(50, 45, 60, 60).stroke();
    doc.fontSize(8).text("LOGO PDAM", 55, 70);
  }

  // Teks Kop
  doc.fillColor("#000000");
  doc.fontSize(14).font("Helvetica-Bold").text(org.org_name || "PERUSAHAAN UMUM DAERAH AIR MINUM", 120, 50, { align: "left" });
  doc.fontSize(16).font("Helvetica-Bold").text(org.org_name_extra || "TIRTA PAKUAN KOTA BOGOR", 120, 68, { align: "left" });
  
  doc.fontSize(9).font("Helvetica").text(org.org_address || "Jl. Siliwangi No.121, RT.01/RW.01, Sukasari, Kec. Bogor Tim., Kota Bogor", 120, 90, { align: "left" });
  doc.text(`Telepon: ${org.org_phone || "(0251) 8324111"} | Email: ${org.org_email || "pdam@tirtapakuan.co.id"}`, 120, 102, { align: "left" });
  
  // Garis Kop Ganda
  doc.moveDown(1);
  doc.lineWidth(2).moveTo(50, 120).lineTo(550, 120).stroke();
  doc.lineWidth(0.5).moveTo(50, 124).lineTo(550, 124).stroke();
  
  doc.moveDown(2);

  // Judul Laporan
  doc.fontSize(14).font("Helvetica-Bold").text(title, { align: "center" });
  if (period) {
    doc.fontSize(10).font("Helvetica").text(`Periode: ${period}`, { align: "center" });
  }
  doc.moveDown(1.5);
};

const drawPDFSignature = (doc, org = {}) => {
  doc.moveDown(4);
  const currentY = doc.y;
  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  doc.fontSize(10).font("Helvetica");
  doc.text(`Bogor, ${dateStr}`, 350, currentY, { align: "center" });
  doc.moveDown(0.5);
  doc.text("Mengetahui,", 350, doc.y, { align: "center" });
  doc.font("Helvetica-Bold").text(org.org_manager_title || "MANAGER LOGISTIK,", 350, doc.y, { align: "center" });
  
  doc.moveDown(4);
  doc.text(`( ${org.org_manager_name || "___________________________"} )`, 350, doc.y, { align: "center" });
  doc.fontSize(9).font("Helvetica").text(`NIP. ${org.org_manager_nip || "............................"}`, 350, doc.y, { align: "center" });
};

// ==========================================
// EXCEL: BARANG KELUAR
// ==========================================
exports.exportBarangKeluarExcel = (req, res) => {
  const { start, end } = req.query;
  let sql = `
    SELECT b.nama_barang as 'Nama Barang', sk.jumlah as 'Jumlah', b.satuan as 'Satuan', sk.tanggal as 'Tanggal', sk.keterangan as 'Keterangan'
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

    // Persiapkan data dengan Header AOA
    const data = [
      ["PERUSAHAAN UMUM DAERAH AIR MINUM TIRTA PAKUAN KOTA BOGOR"],
      ["Jl. Siliwangi No.121, RT.01/RW.01, Sukasari, Kec. Bogor Tim., Kota Bogor"],
      [""],
      ["LAPORAN BARANG KELUAR"],
      [`Periode: ${start || '-'} s/d ${end || '-'}`],
      [""],
      ["No", "Nama Barang", "Jumlah", "Satuan", "Tanggal", "Keterangan"]
    ];

    result.forEach((row, index) => {
      data.push([
        index + 1,
        row['Nama Barang'],
        row['Jumlah'],
        row['Satuan'],
        new Date(row['Tanggal']).toLocaleDateString("id-ID"),
        row['Keterangan'] || '-'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangKeluar");
    
    // Atur lebar kolom agar rapi
    worksheet["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];

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
    SELECT b.nama_barang, sk.jumlah, b.satuan, sk.tanggal, sk.keterangan
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
    doc.fontSize(10).font("Helvetica-Bold").text("NO", 50, doc.y, { width: 30 });
    doc.text("NAMA BARANG", 85, doc.y - 12, { width: 265 });
    doc.text("JUMLAH", 350, doc.y - 12, { width: 100, align: "center" });
    doc.text("TANGGAL", 450, doc.y - 12, { width: 100, align: "right" });
    doc.moveDown(0.5);
    doc.strokeColor("#000000").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Rows
    result.forEach((item, index) => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID");
      const startY = doc.y;
      
      // Hitung tinggi maksimal baris ini berdasarkan teks yang paling panjang
      const nameHeight = doc.heightOfString(item.nama_barang, { width: 265 });
      const ketHeight = item.keterangan ? doc.heightOfString(`Ket: ${item.keterangan}`, { width: 265 }) : 0;
      const rowHeight = Math.max(nameHeight + ketHeight, 15);

      // Render Kolom
      doc.fontSize(9).font("Helvetica").text(index + 1, 50, startY, { width: 30 });
      doc.font("Helvetica-Bold").text(item.nama_barang, 85, startY, { width: 265 });
      
      if (item.keterangan) {
        doc.fontSize(8).font("Helvetica-Oblique").fillColor("#666666").text(`Ket: ${item.keterangan}`, 85, doc.y, { width: 265 });
      }

      doc.fontSize(9).font("Helvetica").fillColor("#000000").text(`${item.jumlah} ${item.satuan || 'Pcs'}`, 350, startY, { width: 100, align: "center" });
      doc.text(tgl, 450, startY, { width: 100, align: "right" });
      
      // Pindah ke baris berikutnya
      doc.y = startY + rowHeight + 10;
      
      doc.strokeColor("#eeeeee").lineWidth(0.5).moveTo(50, doc.y - 5).lineTo(550, doc.y - 5).stroke();
    });

    drawPDFSignature(doc, org);
    doc.end();
  });
};

// ==========================================
// EXCEL: BARANG MASUK
// ==========================================
exports.exportBarangMasukExcel = (req, res) => {
  const { start, end } = req.query;
  let sql = `
    SELECT b.nama_barang as 'Nama Barang', sm.jumlah as 'Jumlah', b.satuan as 'Satuan', sm.tanggal as 'Tanggal', sm.keterangan as 'Keterangan'
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

    const data = [
      ["PERUSAHAAN UMUM DAERAH AIR MINUM TIRTA PAKUAN KOTA BOGOR"],
      ["Jl. Siliwangi No.121, RT.01/RW.01, Sukasari, Kec. Bogor Tim., Kota Bogor"],
      [""],
      ["LAPORAN BARANG MASUK"],
      [`Periode: ${start || '-'} s/d ${end || '-'}`],
      [""],
      ["No", "Nama Barang", "Jumlah", "Satuan", "Tanggal", "Keterangan"]
    ];

    result.forEach((row, index) => {
      data.push([
        index + 1,
        row['Nama Barang'],
        row['Jumlah'],
        row['Satuan'],
        new Date(row['Tanggal']).toLocaleDateString("id-ID"),
        row['Keterangan'] || '-'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BarangMasuk");

    worksheet["!cols"] = [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];

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
    SELECT b.nama_barang, sm.jumlah, b.satuan, sm.tanggal, sm.keterangan
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

    // Table Header
    doc.fontSize(10).font("Helvetica-Bold").text("NO", 50, doc.y, { width: 30 });
    doc.text("NAMA BARANG", 85, doc.y - 12, { width: 265 });
    doc.text("JUMLAH", 350, doc.y - 12, { width: 100, align: "center" });
    doc.text("TANGGAL", 450, doc.y - 12, { width: 100, align: "right" });
    doc.moveDown(0.5);
    doc.strokeColor("#000000").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    result.forEach((item, index) => {
      const tgl = new Date(item.tanggal).toLocaleDateString("id-ID");
      const startY = doc.y;
      
      const nameHeight = doc.heightOfString(item.nama_barang, { width: 265 });
      const ketHeight = item.keterangan ? doc.heightOfString(`Ket: ${item.keterangan}`, { width: 265 }) : 0;
      const rowHeight = Math.max(nameHeight + ketHeight, 15);

      doc.fontSize(9).font("Helvetica").text(index + 1, 50, startY, { width: 30 });
      doc.font("Helvetica-Bold").text(item.nama_barang, 85, startY, { width: 265 });
      
      if (item.keterangan) {
        doc.fontSize(8).font("Helvetica-Oblique").fillColor("#666666").text(`Ket: ${item.keterangan}`, 85, doc.y, { width: 265 });
      }

      doc.fontSize(9).font("Helvetica").fillColor("#000000").text(`${item.jumlah} ${item.satuan || 'Pcs'}`, 350, startY, { width: 100, align: "center" });
      doc.text(tgl, 450, startY, { width: 100, align: "right" });
      
      doc.y = startY + rowHeight + 10;
      doc.strokeColor("#eeeeee").lineWidth(0.5).moveTo(50, doc.y - 5).lineTo(550, doc.y - 5).stroke();
    });

    drawPDFSignature(doc, org);
    doc.end();
  });
};

// ==========================================
// EXCEL: STOK SAAT INI
// ==========================================
exports.exportStokExcel = (req, res) => {
  const sql = "SELECT kode_barang as 'Kode', nama_barang as 'Nama Barang', satuan as 'Satuan', stok as 'Stok' FROM barang WHERE is_deleted = 0";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    const data = [
      ["PERUSAHAAN UMUM DAERAH AIR MINUM TIRTA PAKUAN KOTA BOGOR"],
      ["Jl. Siliwangi No.121, RT.01/RW.01, Sukasari, Kec. Bogor Tim., Kota Bogor"],
      [""],
      ["LAPORAN STOK BARANG SAAT INI"],
      [`Dicetak pada: ${new Date().toLocaleString("id-ID")}`],
      [""],
      ["No", "Kode Barang", "Nama Barang", "Satuan", "Stok"]
    ];

    result.forEach((row, index) => {
      data.push([
        index + 1,
        row['Kode'],
        row['Nama Barang'],
        row['Satuan'],
        row['Stok']
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stok");

    worksheet["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 10 }];

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
  const sql = "SELECT kode_barang, nama_barang, satuan, stok FROM barang WHERE is_deleted = 0";
  
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Disposition", "attachment; filename=laporan_stok.pdf");
    doc.pipe(res);

    drawPDFHeader(doc, org, "LAPORAN STOK SAAT INI");

    // Table Header
    doc.fontSize(10).font("Helvetica-Bold").text("NO", 50, doc.y, { width: 30 });
    doc.text("SKU / KODE", 85, doc.y - 12, { width: 110 });
    doc.text("NAMA BARANG", 200, doc.y - 12, { width: 250 });
    doc.text("STOK", 455, doc.y - 12, { width: 95, align: "right" });
    doc.moveDown(0.5);
    doc.strokeColor("#000000").lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    result.forEach((item, index) => {
      const startY = doc.y;
      
      const nameHeight = doc.heightOfString(item.nama_barang, { width: 250 });
      const rowHeight = Math.max(nameHeight, 15);

      doc.fontSize(9).font("Helvetica").text(index + 1, 50, startY, { width: 30 });
      doc.text(item.kode_barang, 85, startY, { width: 110 });
      doc.font("Helvetica-Bold").text(item.nama_barang, 200, startY, { width: 250 });
      doc.font("Helvetica").text(`${item.stok} ${item.satuan || 'Pcs'}`, 455, startY, { width: 95, align: "right" });
      
      doc.y = startY + rowHeight + 10;
      doc.strokeColor("#eeeeee").lineWidth(0.5).moveTo(50, doc.y - 5).lineTo(550, doc.y - 5).stroke();
    });

    drawPDFSignature(doc, org);
    doc.end();
  });
};