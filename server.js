require('dotenv').config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const barangRoutes = require("./routes/barangRoutes");
const pengajuanRoutes = require("./routes/pengajuanRoutes");
const stokRoutes = require("./routes/stokRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const laporanRoutes = require("./routes/laporanRoutes");
const exportRoutes = require("./routes/exportRoutes");
const notifRoutes = require("./routes/notifRoutes");

const auditRoutes = require("./routes/auditRoutes");

const userRoutes = require("./routes/userRoutes");
const kategoriRoutes = require("./routes/kategoriRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const satuanRoutes = require("./routes/satuanRoutes");

const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandle");
const timeLogger = require("./middlewares/timeLogger");
const sanitizer = require("./middlewares/sanitizer");

const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

const app = express();
app.set('trust proxy', 1); // ✅ Diperlukan agar rate-limiting jalan di Vercel
const server = http.createServer(app);

// =============================
// 🔥 SOCKET.IO INIT
// =============================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  },
});

// 🔥 SIMPAN USER ONLINE (MULTI DEVICE SUPPORT)
global.onlineUsers = {}; // { user_id: [socketId, socketId] }

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("register", (user_id) => {
    const idStr = String(user_id);
    if (!global.onlineUsers[idStr]) {
      global.onlineUsers[idStr] = [];
    }

    global.onlineUsers[idStr].push(socket.id);
    console.log(`✅ User registered: ${idStr} (Socket: ${socket.id})`);
  });

  socket.on("disconnect", () => {
    for (let user_id in global.onlineUsers) {
      global.onlineUsers[user_id] =
        global.onlineUsers[user_id].filter(id => id !== socket.id);

      if (global.onlineUsers[user_id].length === 0) {
        delete global.onlineUsers[user_id];
      }
    }
    console.log("❌ User disconnected:", socket.id);
  });
});

// 🔥 GLOBAL IO
global.io = io;


// =============================
// MIDDLEWARE
// =============================
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173", // Tetap izinkan lokal untuk development
  "http://localhost:3000"
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


// 🔥 LIMITER: Batasi 1000 request per 15 menit per IP (Global)
// Cukup longgar untuk multi-tab testing, tapi tetap aman dari serangan DDoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti." }
});
app.use("/api/", globalLimiter);

// 🔥 AUTH LIMITER: Lebih ketat untuk Login (Anti Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Maksimal 10 percobaan login per 15 menit
  message: { message: "Terlalu banyak percobaan login, silakan tunggu 15 menit." }
});
app.use("/api/auth/login", loginLimiter);

app.use(express.json());
app.use(morgan("tiny")); // 📝 Log ringkas (Hemat CPU/I/O)
app.use(requestLogger);
app.use(timeLogger);
app.use(sanitizer); // 🔥 Proteksi Global dari HTML Injection (XSS)
app.use("/uploads", express.static("uploads"));

// =============================
// ROUTES
// =============================
app.use("/api/auth", authRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/stok", stokRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/notifikasi", notifRoutes);

app.use("/api/audit", auditRoutes);

app.use("/api/users", userRoutes);
app.use("/api/kategori", kategoriRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/satuan", satuanRoutes);

// =============================
// ERROR HANDLER (WAJIB DI BAWAH)
// =============================
app.use(errorHandler);

// =============================
app.get("/", (req, res) => {
  res.send("API Inventory Gudang PDAM");
});

// =============================
// 🔥 START SERVER
// =============================
const PORT = process.env.PORT || 5000;

// Hanya jalankan listen jika tidak di lingkungan Vercel (Production)
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// Ekspor app untuk Vercel
module.exports = app;