const jwt = require("jsonwebtoken");

const SECRET = "secretkey"; // samakan dengan authController

// =============================
// VERIFY TOKEN
// =============================
exports.verifyToken = (req, res, next) => {

  const authHeader = req.headers["authorization"];
  let token = "";

  if (authHeader) {
    // format: "Bearer <token>"
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    // format: query parameter ?token=<token>
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan atau tidak valid" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token expired atau tidak valid" });
  }

};

// =============================
// ROLE CHECKER
// Contoh: allowRoles("admin", "gudang")
// =============================
exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak. Role '${req.user.role}' tidak diizinkan`
      });
    }

    next();
  };
};