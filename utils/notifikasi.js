const db = require("../config/db");
const { sendPushNotification } = require("../config/firebase");

// Helper to query tokens and send push notifications
function triggerPushNotification(user_id, judul, pesan, tipe) {
  db.query("SELECT token FROM user_fcm_tokens WHERE user_id = ?", [user_id], (tokenErr, tokenRows) => {
    if (tokenErr) {
      console.error("❌ [FCM] Error fetching FCM tokens for user:", tokenErr);
      return;
    }
    if (tokenRows && tokenRows.length > 0) {
      const tokens = tokenRows.map(row => row.token);
      sendPushNotification(tokens, judul, pesan, { tipe, user_id: String(user_id) })
        .then(result => {
          if (result.success && result.tokensToRemove && result.tokensToRemove.length > 0) {
            db.query("DELETE FROM user_fcm_tokens WHERE token IN (?)", [result.tokensToRemove], (delErr) => {
              if (delErr) console.error("❌ [FCM] Error cleaning up invalid FCM tokens:", delErr);
            });
          }
        })
        .catch(err => console.error("❌ [FCM] Error sending FCM notification:", err));
    }
  });
}

// =============================
// 🔔 NOTIF KE USER LANGSUNG
// =============================
exports.kirimNotifikasi = (user_id, judul, pesan, tipe = 'info') => {
  // 🔥 TIPS: GROUPING NOTIFIKASI
  // Cek apakah ada notifikasi serupa yang belum dibaca dalam 5 menit terakhir
  const checkSql = `
    SELECT id, pesan FROM notifikasi 
    WHERE user_id = ? AND judul = ? AND is_read = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    LIMIT 1
  `;

  db.query(checkSql, [user_id, judul], (err, rows) => {
    if (!err && rows.length > 0) {
      // Update pesan yang sudah ada daripada menambah baru
      const existingNotif = rows[0];
      const newPesan = existingNotif.pesan.includes(pesan) ? existingNotif.pesan : `${existingNotif.pesan}\n${pesan}`;
      
      db.query("UPDATE notifikasi SET pesan = ?, created_at = NOW() WHERE id = ?", [newPesan, existingNotif.id], (updErr) => {
        if (!updErr) {
          triggerPushNotification(user_id, judul, pesan, tipe);
        }
      });
      
      // Emit socket tetap dilakukan agar UI refresh
      const idStr = String(user_id);
      if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
        global.onlineUsers[idStr].forEach(socketId => {
          global.io.to(socketId).emit("notif_baru", { judul, pesan, tipe });
        });
      }
    } else {
      // Insert baru jika tidak ada yang serupa
      const sql = `
        INSERT INTO notifikasi (user_id, judul, pesan, tipe, is_read, created_at)
        VALUES (?, ?, ?, ?, 0, NOW())
      `;

      db.query(sql, [user_id, judul, pesan, tipe], (err) => {
        if (err) {
          console.log("Notif error:", err);
        } else {
          // Kirim FCM Push Notification
          triggerPushNotification(user_id, judul, pesan, tipe);

          const idStr = String(user_id);
          if (global.io && global.onlineUsers && global.onlineUsers[idStr]) {
            global.onlineUsers[idStr].forEach(socketId => {
              global.io.to(socketId).emit("notif_baru", { judul, pesan, tipe });
            });
          }
          broadcastRefreshToAdmins([user_id]);
        }
      });
    }
  });
};

// =============================
// 🔥 NOTIF BERDASARKAN ROLE
// =============================
exports.kirimNotifikasiByRole = (role_nama, judul, pesan, tipe = 'info') => {
  const sql = `
    SELECT users.id 
    FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE roles.nama_role = ?
  `;

  db.query(sql, [role_nama], (err, users) => {
    if (err) return console.log(err);

    users.forEach((user) => {
      exports.kirimNotifikasi(user.id, judul, pesan, tipe);
    });
  });
};

// =============================
// 🏢 NOTIF BERDASARKAN ROLE + DEPARTEMEN
// =============================
exports.kirimNotifikasiByRoleAndDept = (role_nama, dept_id, judul, pesan, tipe = 'info') => {
  if (!dept_id) return exports.kirimNotifikasiByRole(role_nama, judul, pesan, tipe);

  const sql = `
    SELECT u.id FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.nama_role = ? AND u.id_dept = ?
  `;

  db.query(sql, [role_nama, dept_id], (err, users) => {
    if (err) return console.log(err);
    users.forEach((user) => {
      exports.kirimNotifikasi(user.id, judul, pesan, tipe);
    });
  });
};

// =============================
// 🧩 NOTIF BERDASARKAN ROLE + SUB-DEPT
// =============================
exports.kirimNotifikasiByRoleAndSubDept = (role_nama, sub_dept_id, judul, pesan, tipe = 'info') => {
  if (!sub_dept_id) return exports.kirimNotifikasiByRole(role_nama, judul, pesan, tipe);

  const sql = `
    SELECT u.id FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.nama_role = ? AND u.id_subdept = ?
  `;

  db.query(sql, [role_nama, sub_dept_id], (err, users) => {
    if (err) return console.log(err);
    users.forEach((user) => {
      exports.kirimNotifikasi(user.id, judul, pesan, tipe);
    });
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