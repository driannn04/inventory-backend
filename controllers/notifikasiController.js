const db = require("../config/db");
exports.getNotifikasi = (req,res)=>{

const {user_id} = req.params;

const sql = `
SELECT * FROM notifikasi
WHERE user_id=?
ORDER BY created_at DESC
`;

db.query(sql,[user_id],(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

};