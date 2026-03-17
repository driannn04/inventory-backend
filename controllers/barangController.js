    const db = require("../config/db");
    const QRCode = require("qrcode");
    const response = require("../utils/response");


    // ambil semua barang
    exports.getBarang = (req,res)=>{

    const sql = `
    SELECT barang.*, kategori_barang.nama_kategori
    FROM barang
    JOIN kategori_barang
    ON barang.kategori_id = kategori_barang.id
    `;

    db.query(sql,(err,result)=>{
        if(err){
            return res.status(500).json(err);
        }

        res.json(result);
    });

    };

    exports.tambahBarang = async (req,res)=>{

    try{

    const {
    kode_barang,
    nama_barang,
    kategori_id,
    satuan,
    stok,
    stok_minimum,
    lokasi_rak
    } = req.body;

    const foto = req.file ? req.file.filename : null;

    // generate QR
    const qrData = JSON.stringify({
    kode_barang:kode_barang
    });

    const qrCode = await QRCode.toDataURL(qrData);

    const sql = `
    INSERT INTO barang
    (kode_barang,nama_barang,kategori_id,satuan,stok,stok_minimum,lokasi_rak,foto,qr_code)
    VALUES (?,?,?,?,?,?,?,?,?)
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
    foto,
    qrCode
    ],
    (err,result)=>{

    if(err){
    return res.status(500).json(err);
    }

    res.json({
    message:"Barang berhasil ditambahkan"
    });

    });

    }catch(err){

    res.status(500).json(err);

    }

    };


    exports.getBarangById = (req,res)=>{

    const id = req.params.id;

    const sql = "SELECT * FROM barang WHERE id=?";

    db.query(sql,[id],(err,result)=>{

        if(err){
            return res.status(500).json(err);
        }

        res.json(result[0]);

    });

    };

    exports.updateBarang = (req,res)=>{

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

if(req.file){
  foto = req.file.filename;
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

db.query(sql,[
  nama_barang,
  kategori_id,
  satuan,
  stok,
  stok_minimum,
  lokasi_rak,
  foto,
  id
],(err,result)=>{

if(err){
  return res.status(500).json(err);
}

res.json({
  message:"Barang berhasil diupdate"
});

});

};
    exports.deleteBarang = (req,res)=>{

    const id = req.params.id;

    const sql = "DELETE FROM barang WHERE id=?";

    db.query(sql,[id],(err,result)=>{

        if(err){
            return res.status(500).json(err);
        }

        res.json({
            message:"Barang berhasil dihapus"
        });

    });

    };

    exports.generateQR = async (req,res)=>{

    const {id} = req.params;

    const sql = "SELECT * FROM barang WHERE id=?";

    db.query(sql,[id], async (err,result)=>{

    if(err) return res.status(500).json(err);

    if(result.length === 0){
    return res.status(404).json({message:"Barang tidak ditemukan"});
    }

    const barang = result[0];

    const qrData = {
    id:barang.id,
    nama_barang:barang.nama_barang,
    kode_barang:barang.kode_barang
    };

    const qr = await QRCode.toDataURL(JSON.stringify(qrData));

    res.json({
    barang:barang.nama_barang,
    qr_code:qr
    });

    });

    };

    exports.searchBarang = (req,res)=>{

    const {keyword} = req.query;

    const sql = `
    SELECT * FROM barang
    WHERE nama_barang LIKE ?
    OR kode_barang LIKE ?
    `;

    const search = `%${keyword}%`;

    db.query(sql,[search,search],(err,result)=>{

    if(err) return res.status(500).json(err);

    res.json(result);

    });

    };

    exports.getStokMinimum = (req,res)=>{

    const sql = `
    SELECT nama_barang,stok,stok_minimum
    FROM barang
    WHERE stok <= stok_minimum
    `;

    db.query(sql,(err,result)=>{

    if(err) return res.status(500).json(err);

    res.json(result);

    });

    };


    exports.getBarangPagination = (req,res)=>{

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    const sql = `
    SELECT * FROM barang
    LIMIT ? OFFSET ?
    `;

    db.query(sql,[limit,offset],(err,data)=>{

    if(err) return response.error(res,"Gagal mengambil data");

    const countQuery = "SELECT COUNT(*) as total FROM barang";

    db.query(countQuery,(err2,count)=>{

    const total = count[0].total;

    const meta = {

    page:page,
    limit:limit,
    total_data:total,
    total_page:Math.ceil(total/limit)

    };

    response.success(res,"Data barang berhasil diambil",data,meta);

    });

    });

    };

    exports.createBarang = async (req,res)=>{

    const {nama_barang,kode_barang,stok} = req.body;

    const foto = req.file ? req.file.filename : null;

    const qrData = JSON.stringify({
    kode_barang:kode_barang
    });

    const qrCode = await QRCode.toDataURL(qrData);

    const sql = `
    INSERT INTO barang
    (nama_barang,kode_barang,stok,foto,qr_code)
    VALUES (?,?,?,?,?)
    `;

    db.query(sql,[nama_barang,kode_barang,stok,foto,qrCode],(err)=>{

    if(err) return res.status(500).json(err);

    res.json({
    message:"Barang berhasil ditambahkan"
    });

    });

    };

    exports.downloadQR = (req,res)=>{

    const {id} = req.params;

    const sql = "SELECT qr_code FROM barang WHERE id=?";

    db.query(sql,[id],(err,result)=>{

    if(err) return res.status(500).json(err);

    if(result.length === 0){
    return res.status(404).json({message:"Barang tidak ditemukan"});
    }

    const qr = result[0].qr_code;

    if(!qr){
    return res.status(400).json({
    message:"QR code belum tersedia"
    });
    }

    const base64Data = qr.replace(/^data:image\/png;base64,/,"");

    const img = Buffer.from(base64Data,"base64");

    res.setHeader("Content-Type","image/png");

    res.send(img);

    });

    };