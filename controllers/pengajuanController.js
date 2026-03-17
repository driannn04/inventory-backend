const db = require("../config/db");

exports.createPengajuan = (req,res)=>{

const {user_id,items,catatan,role} = req.body;

let status = "pending_assessment";

if(role === "manager"){
status = "pending_gudang";
}

const nomor = "PGJ-"+Date.now();

const sqlPengajuan = `
INSERT INTO pengajuan (nomor_pengajuan,user_id,status,tanggal_pengajuan,catatan)
VALUES (?,?,?,CURDATE(),?)
`;

db.query(sqlPengajuan,[nomor,user_id,status,catatan],(err,result)=>{

if(err) return res.status(500).json(err);

const pengajuan_id = result.insertId;

items.forEach(item=>{

const sqlDetail = `
INSERT INTO pengajuan_detail (pengajuan_id,barang_id,jumlah)
VALUES (?,?,?)
`;

db.query(sqlDetail,[pengajuan_id,item.barang_id,item.jumlah]);

});

res.json({
message:"Pengajuan berhasil dibuat",
nomor_pengajuan:nomor
});

});

};


exports.getPengajuan = (req,res)=>{

 const sql = `
 SELECT pengajuan.*, users.nama
 FROM pengajuan
 JOIN users ON pengajuan.user_id = users.id
 ORDER BY pengajuan.created_at DESC
 `;

 db.query(sql,(err,result)=>{

    if(err) return res.status(500).json(err);

    res.json(result);

 });

};

exports.getPengajuanById = (req,res)=>{

 const id = req.params.id;

 const sql = `
 SELECT p.nomor_pengajuan,p.status,p.catatan,
 b.nama_barang,d.jumlah
 FROM pengajuan p
 JOIN pengajuan_detail d ON p.id=d.pengajuan_id
 JOIN barang b ON d.barang_id=b.id
 WHERE p.id=?
 `;

 db.query(sql,[id],(err,result)=>{

    if(err) return res.status(500).json(err);

    res.json(result);

 });

};

exports.approvePengajuan = (req,res)=>{

const {pengajuan_id,role,user_id} = req.body;

if(role === "assesment"){

const sql = "UPDATE pengajuan SET status='pending_manager' WHERE id=?";

db.query(sql,[pengajuan_id]);

}

else if(role === "manager"){

const sql = "UPDATE pengajuan SET status='pending_gudang' WHERE id=?";

db.query(sql,[pengajuan_id]);

}

else if(role === "gudang"){

// ambil detail barang
const sqlDetail = `
SELECT barang_id,jumlah 
FROM pengajuan_detail 
WHERE pengajuan_id=?
`;

db.query(sqlDetail,[pengajuan_id],(err,result)=>{

if(err) return res.status(500).json(err);

result.forEach(item=>{

// kurangi stok barang
const sqlUpdate = `
UPDATE barang
SET stok = stok - ?
WHERE id = ?
`;

db.query(sqlUpdate,[item.jumlah,item.barang_id]);

// simpan stok keluar
const sqlStokKeluar = `
INSERT INTO stok_keluar (barang_id,pengajuan_id,jumlah,tanggal)
VALUES (?,?,?,CURDATE())
`;

db.query(sqlStokKeluar,[item.barang_id,pengajuan_id,item.jumlah]);

});

// update status pengajuan
const sqlStatus = "UPDATE pengajuan SET status='completed' WHERE id=?";

db.query(sqlStatus,[pengajuan_id]);

});

}

// simpan log approval
const sqlApproval = `
INSERT INTO approval (pengajuan_id,approved_by,role,status,tanggal)
VALUES (?,?,?,'approved',NOW())
`;

db.query(sqlApproval,[pengajuan_id,user_id,role]);

res.json({
message:"Approval berhasil"
});

};



exports.rejectPengajuan = (req,res)=>{

 const {pengajuan_id,role,user_id,catatan} = req.body;

 const sql = "UPDATE pengajuan SET status='rejected' WHERE id=?";

 db.query(sql,[pengajuan_id],(err)=>{

    if(err) return res.status(500).json(err);

    const sqlLog = `
    INSERT INTO approval (pengajuan_id,approved_by,role,status,catatan,tanggal)
    VALUES (?,?,?,'rejected',?,NOW())
    `;

    db.query(sqlLog,[pengajuan_id,user_id,role,catatan]);

    res.json({
        message:"Pengajuan ditolak"
    });

 });

};

