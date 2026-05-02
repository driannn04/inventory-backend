const db = require("../config/db");
exports.laporanStok = (req,res)=>{

const sql = `
SELECT kode_barang,nama_barang,stok
FROM barang
`;

db.query(sql,(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

};

exports.laporanBarangMasuk = (req,res)=>{

const {start,end} = req.query;

const sql = `
SELECT b.nama_barang,sm.jumlah,sm.tanggal
FROM stok_masuk sm
JOIN barang b ON sm.barang_id=b.id
WHERE DATE(sm.tanggal) BETWEEN ? AND ?
`;

db.query(sql,[start,end],(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

};

exports.laporanBarangKeluar = (req,res)=>{

const {start,end} = req.query;

const sql = `
SELECT b.nama_barang,sk.jumlah,sk.tanggal
FROM stok_keluar sk
JOIN barang b ON sk.barang_id=b.id
WHERE DATE(sk.tanggal) BETWEEN ? AND ?
`;

db.query(sql,[start,end],(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

};


