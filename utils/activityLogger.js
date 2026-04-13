const db = require("../config/db");

/**
 * Log activity to database
 * @param {number} userId - ID of the user performing the action
 * @param {string} action - Action name (e.g., 'TAMBAH', 'UBAH', 'HAPUS')
 * @param {string} dataType - Type of data affected (e.g., 'BARANG', 'STOK', 'PENGAJUAN')
 * @param {string} description - Detailed description
 */
const logActivity = (userId, action, dataType, description) => {
  const sql = `
    INSERT INTO activity_logs (user_id, aksi, tipe_data, keterangan, created_at)
    VALUES (?, ?, ?, ?, NOW())
  `;
  
  db.query(sql, [userId, action, dataType, description], (err) => {
    if (err) {
      console.error("❌ Failed to log activity:", err);
    }
  });
};

module.exports = { logActivity };
