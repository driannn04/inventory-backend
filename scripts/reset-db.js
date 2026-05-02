const db = require("../config/db");
const bcrypt = require("bcryptjs");

const resetDatabase = async () => {
  console.log("🌊 Memulai pembersihan database (Aqua Reset)...");

  const tables = [
    "activity_logs",
    "audit_logs",
    "notifikasi",
    "pengajuan_item",
    "pengajuan",
    "stok_masuk",
    "stok_keluar",
    "mutasi",
    "stock_opname",
    "barang",
    "kategori",
    "satuan",
    "suppliers",
    "system_settings",
    "users"
  ];

  try {
    // 1. Matikan Foreign Key
    await db.promise().query("SET FOREIGN_KEY_CHECKS = 0");

    // 2. Bersihkan Tabel satu per satu (abaikan jika tidak ada)
    for (let table of tables) {
      try {
        await db.promise().query(`DELETE FROM ${table}`);
        await db.promise().query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        console.log(`✅ Berhasil membersihkan: ${table}`);
      } catch (e) {
        console.log(`🟡 Skip: ${table} (Mungkin tidak ada)`);
      }
    }


    // Buat Password Admin (admin123)
    const hashedPw = bcrypt.hashSync("admin123", 10);
    
    // Pastikan role_id 1 adalah Admin (Biasanya role_id 1 adalah Admin)
    await db.promise().query(
      "INSERT INTO users (id, nup, nama, password, role_id) VALUES (1, '12345', 'Super Admin PDAM', ?, 1)",
      [hashedPw]
    );

    console.log("\n✨ DATABASE BERHASIL DIRESET TOTAL!");
    console.log("-----------------------------------------");
    console.log("Login Detail (Baru):");
    console.log("NUP      : 12345");
    console.log("Password : admin123");
    console.log("-----------------------------------------");
    console.log("Silakan login dan mulai input data rilis PDAM.");

  } catch (err) {
    console.error("❌ Gagal mereset database:", err.message);
  } finally {
    process.exit();
  }
};

resetDatabase();
