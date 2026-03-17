const db = require("../config/db");
const XLSX = require("xlsx");

exports.exportBarangKeluarExcel = (req,res)=>{

const sql = `
SELECT b.nama_barang,sk.jumlah,sk.tanggal
FROM stok_keluar sk
JOIN barang b ON sk.barang_id=b.id
`;

db.query(sql,(err,result)=>{

if(err) return res.status(500).json(err);

// convert ke worksheet
const worksheet = XLSX.utils.json_to_sheet(result);

// buat workbook
const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(workbook,worksheet,"BarangKeluar");

// generate buffer
const buffer = XLSX.write(workbook,{type:"buffer",bookType:"xlsx"});

res.setHeader(
"Content-Disposition",
"attachment; filename=laporan_barang_keluar.xlsx"
);

res.send(buffer);

});

};

const PDFDocument = require("pdfkit");

exports.exportBarangKeluarPDF = (req,res)=>{

const sql = `
SELECT b.nama_barang,sk.jumlah,sk.tanggal
FROM stok_keluar sk
JOIN barang b ON sk.barang_id=b.id
`;

db.query(sql,(err,result)=>{

if(err) return res.status(500).json(err);

const doc = new PDFDocument();

res.setHeader(
"Content-Disposition",
"attachment; filename=laporan_barang_keluar.pdf"
);

doc.pipe(res);

doc.fontSize(18).text("Laporan Barang Keluar",{
align:"center"
});

doc.moveDown();

result.forEach(item=>{

doc.fontSize(12).text(
`${item.nama_barang} - ${item.jumlah} - ${item.tanggal}`
);

});

doc.end();

});

};