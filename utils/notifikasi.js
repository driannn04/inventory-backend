const db = require("../config/db");

// =============================
// 🔔 NOTIF KE USER LANGSUNG
// =============================
exports.kirimNotifikasi = (user_id, judul, pesan) => {
  const sql = `
    INSERT INTO notifikasi (user_id, judul, pesan, is_read, created_at)
    VALUES (?, ?, ?, 0, NOW())
  `;

  db.query(sql, [user_id, judul, pesan], (err) => {
    if (err) {
      console.error("❌ DB Insert Notif Error:", err.message);
    } else {
      // realtime
      const idStr = String(user_id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        console.log(`📡 Sending realtime notif to User ${idStr}`);
        global.onlineUsers[idStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan });
        });
      } else {
        console.log(`⚠️ User ${idStr} is offline, notif saved to DB.`);
      }
    }
  });
};

// =============================
// 🔥 NOTIF BERDASARKAN ROLE
// =============================
exports.kirimNotifikasiByRole = (role_nama, judul, pesan) => {
  const sql = `
    SELECT users.id 
    FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE roles.nama_role = ?
  `;

  db.query(sql, [role_nama], (err, users) => {
    if (err) return console.log(err);

    users.forEach((user) => {
      const insert = `
        INSERT INTO notifikasi (user_id, judul, pesan, is_read, created_at)
        VALUES (?, ?, ?, 0, NOW())
      `;

      db.query(insert, [user.id, judul, pesan], (err) => {
         if (err) console.error("❌ DB Insert Role Notif Error:", err.message);
      });

      // 🔥 REALTIME JUGA
      const roleIdStr = String(user.id);
      if (global.io && global.onlineUsers && global.onlineUsers[roleIdStr]) {
        global.onlineUsers[roleIdStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan });
        });
      }
    });
  });
};