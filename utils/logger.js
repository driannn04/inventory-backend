const db = require("../config/db");

exports.logAktivitas = (user_id,aktivitas)=>{

const sql = `
INSERT INTO log_aktivitas (user_id,aktivitas)
VALUES (?,?)
`;

db.query(sql,[user_id,aktivitas]);

};