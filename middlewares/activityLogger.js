const db = require("../config/db");

// Middleware untuk mencatat aktivitas
const activityLogger = (aksiCustom, tipeData) => {
  return (req, res, next) => {
    // Simpan data asli jika perlu (seperti res.json)
    const originalJson = res.json;
    res.json = function (data) {
      res.json = originalJson; // Restore original

      // Hanya catat aksi jika request sukses (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user_id = req.user ? req.user.id : null;
        
        if (user_id) {
          const method = req.method;
          let aksi = aksiCustom || "";
          
          if (!aksi) {
            if (method === "POST") aksi = "Tambah";
            if (method === "PUT") aksi = "Edit";
            if (method === "DELETE") aksi = "Hapus";
          }

          const keterangan = `User melakukan ${aksi} pada ${tipeData || 'Data'}. ${data.message || ""}`;
          const target_id = req.params.id || data.id || null;

          const sql = "INSERT INTO activity_logs (user_id, aksi, tipe_data, target_id, keterangan) VALUES (?, ?, ?, ?, ?)";
          db.query(sql, [user_id, aksi, tipeData || 'Umum', target_id, keterangan], (err) => {
            if (err) console.error("❌ Gagal mencatat log aktivitas:", err.message);
          });
        }
      }

      return res.json(data);
    };

    next();
  };
};

module.exports = activityLogger;
