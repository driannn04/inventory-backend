const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixLogin() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'inventory_gudang_pdam'
    });

    try {
        const plainPassword = '123456';
        const salt = await bcrypt.genSalt(8);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        console.log(`Mengatur ulang SEMUA password user...`);
        console.log(`Password Baru: ${plainPassword}`);
        console.log(`Hash Baru: ${hashedPassword}`);

        const [result] = await db.execute("UPDATE users SET password = ?", [hashedPassword]);
        
        console.log(`✅ Berhasil! ${result.affectedRows} user telah diupdate passwordnya.`);

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await db.end();
        process.exit();
    }
}

fixLogin();
