const db = require("../config/db");

/**
 * Log activity to database with enhanced audit trail
 * @param {number} userId - ID of the user performing the action
 * @param {string} action - Action name (e.g., 'TAMBAH', 'UBAH', 'HAPUS')
 * @param {string} dataType - Type of data affected (e.g., 'BARANG', 'STOK', 'PENGAJUAN')
 * @param {string} description - Detailed description
 * @param {Object} extra - { req, dataLama, dataBaru }
 */
const logActivity = (userId, action, dataType, description, extra = {}) => {
  const { req, dataLama, dataBaru } = extra;
  
  // 🔥 DETEKSI IP LEBIH AKURAT
  let ipAddress = null;
  if (req) {
    const forwarded = req.headers["x-forwarded-for"];
    // Ambil IP pertama jika ada proxy (Netlify/Nginx), jika tidak pakai remoteAddress
    ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    
    // Rapikan format localhost (::ffff:127.0.0.1 -> 127.0.0.1)
    if (ipAddress && ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.replace('::ffff:', '');
    }
    // Rapikan IPv6 localhost (::1 -> localhost)
    if (ipAddress === '::1') ipAddress = '127.0.0.1 (Localhost)';
  }

  const userAgent = req ? (req.headers["user-agent"] || null) : null;

  // Stringify data jika berupa object
  const oldData = dataLama ? (typeof dataLama === "object" ? JSON.stringify(dataLama) : dataLama) : null;
  const newData = dataBaru ? (typeof dataBaru === "object" ? JSON.stringify(dataBaru) : dataBaru) : null;

  const sql = `
    INSERT INTO activity_logs (user_id, ip_address, user_agent, aksi, tipe_data, keterangan, data_lama, data_baru, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  
  db.query(sql, [userId, ipAddress, userAgent, action, dataType, description, oldData, newData], (err) => {
    if (err) {
      console.error("❌ Failed to log activity:", err);
    }
  });
};

module.exports = { logActivity };

