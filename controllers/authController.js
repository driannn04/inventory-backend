const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Registrasi Mandiri dihapus untuk keamanan sistem internal. 
// User hanya bisa dibuat oleh Admin melalui menu Manajemen User.

exports.login = (req,res)=>{

const {nup,password} = req.body;

const sql = `
SELECT users.*, roles.nama_role
FROM users
JOIN roles ON users.role_id = roles.id
WHERE nup = ?
`;

db.query(sql,[nup],(err,result)=>{

    if(err) return res.status(500).json(err);

    if(result.length === 0){
        return res.status(404).json({message:"User tidak ditemukan"});
    }

    const user = result[0];

    const validPassword = bcrypt.compareSync(password,user.password);

    if(!validPassword){
        return res.status(401).json({message:"Password salah"});
    }

    const token = jwt.sign(
        {id:user.id,role:user.nama_role},
        process.env.JWT_SECRET || "secretkey",
        {expiresIn:"1d"}
    );

    res.json({
        message:"Login berhasil",
        token:token,
        user:{
            id:user.id,
            nama:user.nama,
            nup:user.nup,
            role:user.nama_role
        }
    });

});

};

exports.checkNup = (req,res) => {
    const { nup } = req.params;
    const sql = `
        SELECT users.nama, roles.nama_role as role 
        FROM users 
        JOIN roles ON users.role_id = roles.id 
        WHERE nup = ?
    `;
    db.query(sql, [nup], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) {
            return res.status(404).json({ message: "NUP tidak ditemukan" });
        }
        res.json({ 
            nama: result[0].nama,
            role: result[0].role
        });
    });
};