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
      // 1. Realtime Notif (Pop-up & List) untuk penerima asli
      const idStr = String(user_id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        global.onlineUsers[idStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan });
        });
      }

      // 2. Sinyal Refresh Badge (Diam) untuk semua Admin agar badge update
      broadcastRefreshToAdmins([user_id]);
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

    const sentIds = [];
    users.forEach((user) => {
      sentIds.push(user.id);
      const insert = `
        INSERT INTO notifikasi (user_id, judul, pesan, is_read, created_at)
        VALUES (?, ?, ?, 0, NOW())
      `;
      db.query(insert, [user.id, judul, pesan]);

      // Realtime Notif untuk role terkait
      const idStr = String(user.id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        global.onlineUsers[idStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan });
        });
      }
    });

    // Sinyal Refresh Badge untuk Admin (jika admin bukan penerima utama)
    broadcastRefreshToAdmins(sentIds);
  });
};

// =============================
// 🏢 NOTIF BERDASARKAN ROLE + DEPARTEMEN
// =============================
exports.kirimNotifikasiByRoleAndDept = (role_nama, dept_id, judul, pesan) => {
  if (!dept_id) {
    // Fallback: jika dept_id kosong, kirim ke semua dengan role tersebut
    return exports.kirimNotifikasiByRole(role_nama, judul, pesan);
  }

  const sql = `
    SELECT u.id 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.nama_role = ? AND u.id_dept = ?
  `;

  db.query(sql, [role_nama, dept_id], (err, users) => {
    if (err) return console.log(err);

    const sentIds = [];
    users.forEach((user) => {
      sentIds.push(user.id);
      const insert = `
        INSERT INTO notifikasi (user_id, judul, pesan, is_read, created_at)
        VALUES (?, ?, ?, 0, NOW())
      `;
      db.query(insert, [user.id, judul, pesan]);

      const idStr = String(user.id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        global.onlineUsers[idStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan });
        });
      }
    });

    broadcastRefreshToAdmins(sentIds);
  });
};

// ⚡ Sinyal refresh data "diam" (Hanya untuk update badge/list, tanpa pop-up toast)
function broadcastRefreshToAdmins(skipIds = []) {
  const sqlAdmin = `SELECT users.id FROM users JOIN roles ON users.role_id = roles.id WHERE roles.nama_role = 'admin'`;
  db.query(sqlAdmin, (err, admins) => {
    if (err) return;
    admins.forEach(adm => {
      if (skipIds.includes(adm.id)) return;
      const idStr = String(adm.id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        global.onlineUsers[idStr].forEach(socketId => {
          // Gunakan event 'refresh_data' agar Topbar tau ini hanya untuk refresh, bukan untuk pop-up
          global.io.to(socketId).emit("refresh_data");
        });
      }
    });
  });
}