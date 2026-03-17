const db = require("../config/db");

exports.kirimNotifikasi = (user_id,judul,pesan)=>{

const sql = `
INSERT INTO notifikasi (user_id,judul,pesan)
VALUES (?,?,?)
`;

db.query(sql,[user_id,judul,pesan]);

};