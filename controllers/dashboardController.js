const db = require("../config/db");

exports.getDashboard = async (req,res)=>{

let dashboard = {};

// SUMMARY
const summaryQuery = `
SELECT 
(SELECT COUNT(*) FROM barang) as total_barang,
(SELECT SUM(stok) FROM barang) as total_stok,
(SELECT COUNT(*) FROM barang WHERE stok <= stok_minimum) as stok_minimum,
(SELECT COUNT(*) FROM pengajuan WHERE status != 'completed' AND status != 'rejected') as pengajuan_pending
`;

db.query(summaryQuery,(err,summary)=>{

dashboard.summary = summary[0];


// BARANG MASUK PER BULAN
const masukQuery = `
SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
FROM stok_masuk
GROUP BY MONTH(tanggal)
`;

db.query(masukQuery,(err2,masuk)=>{

dashboard.barang_masuk_bulanan = masuk;


// BARANG KELUAR PER BULAN
const keluarQuery = `
SELECT MONTH(tanggal) as bulan, SUM(jumlah) as total
FROM stok_keluar
GROUP BY MONTH(tanggal)
`;

db.query(keluarQuery,(err3,keluar)=>{

dashboard.barang_keluar_bulanan = keluar;


// TOP BARANG PALING SERING KELUAR
const topBarang = `
SELECT b.nama_barang, SUM(sk.jumlah) as total_keluar
FROM stok_keluar sk
JOIN barang b ON sk.barang_id = b.id
GROUP BY sk.barang_id
ORDER BY total_keluar DESC
LIMIT 5
`;

db.query(topBarang,(err4,top)=>{

dashboard.top_barang_keluar = top;


// STOK MINIMUM LIST
const stokMinimum = `
SELECT nama_barang,stok,stok_minimum
FROM barang
WHERE stok <= stok_minimum
`;

db.query(stokMinimum,(err5,min)=>{

dashboard.stok_minimum = min;


// AKTIVITAS TERBARU
const aktivitas = `
SELECT log_aktivitas.*, users.nama
FROM log_aktivitas
JOIN users ON log_aktivitas.user_id = users.id
ORDER BY created_at DESC
LIMIT 5
`;

db.query(aktivitas,(err6,log)=>{

dashboard.aktivitas_terbaru = log;

res.json(dashboard);

});

});

});

});

});

});

};