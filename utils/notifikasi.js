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
      console.log("Notif error:", err);
    } else {
      // realtime
      if (global.io && global.onlineUsers[user_id]) {
        global.io.to(global.onlineUsers[user_id]).emit("notif_baru", {
          judul,
          pesan
        });
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

      db.query(insert, [user.id, judul, pesan]);

      // 🔥 REALTIME JUGA
      if (global.io && global.onlineUsers[user.id]) {
        global.io.to(global.onlineUsers[user.id]).emit("notif_baru", {
          judul,
          pesan
        });
      }
    });
  });
};