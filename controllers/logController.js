exports.getLog = (req,res)=>{

const sql = `
SELECT log_aktivitas.*,users.nama
FROM log_aktivitas
JOIN users ON log_aktivitas.user_id=users.id
ORDER BY created_at DESC
LIMIT 20
`;

db.query(sql,(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

};