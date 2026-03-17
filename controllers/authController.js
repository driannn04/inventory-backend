    const db = require("../config/db");
    const bcrypt = require("bcryptjs");
    const jwt = require("jsonwebtoken");

    exports.register = (req,res)=>{
        
        const {nama,email,password,role_id} = req.body;

        const hashedPassword = bcrypt.hashSync(password,8);

        const sql = "INSERT INTO users (nama,email,password,role_id) VALUES (?,?,?,?)";

        db.query(sql,[nama,email,hashedPassword,role_id],(err,result)=>{
            if(err){
                return res.status(500).json(err);
            }

            res.json({
                message:"User berhasil dibuat"
            });
        });

    };

    exports.login = (req,res)=>{

    const {email,password} = req.body;

    const sql = `
    SELECT users.*, roles.nama_role
    FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE email = ?
    `;

    db.query(sql,[email],(err,result)=>{

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
            "secretkey",
            {expiresIn:"1d"}
        );

        res.json({
            message:"Login berhasil",
            token:token,
            user:{
                id:user.id,
                nama:user.nama,
                email:user.email,
                role:user.nama_role
            }
        });

    });

    };