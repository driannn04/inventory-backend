const db = require("../config/db");


// stok masuk
exports.tambahStokMasuk = (req,res)=>{

const {barang_id,jumlah,keterangan} = req.body;

const tanggal = new Date();

const sqlMasuk = `
INSERT INTO stok_masuk (barang_id,jumlah,tanggal,keterangan)
VALUES (?,?,?,?)
`;

db.query(sqlMasuk,[barang_id,jumlah,tanggal,keterangan],(err)=>{

if(err){
return res.status(500).json(err);
}

// update stok barang
const sqlUpdate = `
UPDATE barang
SET stok = stok + ?
WHERE id = ?
`;

db.query(sqlUpdate,[jumlah,barang_id],(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Stok berhasil ditambahkan"
});

});

});

};

// ambil riwayat stok masuk
exports.getStokMasuk = (req,res)=>{

const sql = `
SELECT stok_masuk.*, barang.nama_barang
FROM stok_masuk
JOIN barang
ON stok_masuk.barang_id = barang.id
ORDER BY stok_masuk.tanggal DESC
`;

db.query(sql,(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

});

};

// stok keluar
exports.tambahStokKeluar = (req,res)=>{

const {barang_id,jumlah,keterangan} = req.body;

const tanggal = new Date();

// cek stok barang dulu
const cekStok = `
SELECT stok FROM barang WHERE id = ?
`;

db.query(cekStok,[barang_id],(err,result)=>{

if(err){
return res.status(500).json(err);
}

const stokSekarang = result[0].stok;

if(stokSekarang < jumlah){

return res.status(400).json({
message:"Stok tidak mencukupi"
});

}

// simpan ke stok_keluar
const sqlKeluar = `
INSERT INTO stok_keluar (barang_id,jumlah,tanggal,keterangan)
VALUES (?,?,?,?)
`;

db.query(sqlKeluar,[barang_id,jumlah,tanggal,keterangan],(err)=>{

if(err){
return res.status(500).json(err);
}

// kurangi stok barang
const updateStok = `
UPDATE barang
SET stok = stok - ?
WHERE id = ?
`;

db.query(updateStok,[jumlah,barang_id],(err)=>{

if(err){
return res.status(500).json(err);
}

res.json({
message:"Stok berhasil dikurangi"
});

});

});

});

};

exports.getStokKeluar = (req,res)=>{

const sql = `
SELECT stok_keluar.*, barang.nama_barang
FROM stok_keluar
JOIN barang
ON stok_keluar.barang_id = barang.id
ORDER BY stok_keluar.tanggal DESC
`;

db.query(sql,(err,result)=>{

if(err){
return res.status(500).json(err);
}

res.json(result);

});

};