const db = require("../config/db");

// =============================
// GET NOTIF USER
// =============================
exports.getNotifikasi = (req,res)=>{

const {user_id} = req.params;

const sql = `
SELECT *
FROM notifikasi
WHERE user_id = ?
ORDER BY created_at DESC
`;

// ✅ FIX: user_id hanya 1x, bukan [user_id, user_id]
db.query(sql,[user_id],(err,result)=>{

if(err){
  console.log("ERROR NOTIF:", err);
  return res.status(500).json(err);
}

res.json(result);

});

};

// =============================
// MARK AS READ
// =============================
exports.readNotif = (req,res)=>{

const {id} = req.params;

const sql = `
UPDATE notifikasi
SET is_read = 1
WHERE id = ?
`;

db.query(sql,[id],(err)=>{
if(err) return res.status(500).json(err);

res.json({
message:"Notifikasi dibaca"
});

});

};

// =============================
// MARK ALL AS READ 🔥
// =============================
exports.readAllNotif = (req,res)=>{

const {user_id} = req.params;

const sql = `
UPDATE notifikasi
SET is_read = 1
WHERE user_id = ?
`;

db.query(sql,[user_id],(err)=>{
if(err) return res.status(500).json(err);

res.json({
message:"Semua notifikasi dibaca"
});

});

};

// =============================
// DELETE NOTIF
// =============================
exports.deleteNotif = (req,res)=>{

const {id} = req.params;

const sql = `
DELETE FROM notifikasi WHERE id = ?
`;

db.query(sql,[id],(err)=>{
if(err) return res.status(500).json(err);

res.json({
message:"Notifikasi dihapus"
});

});

};