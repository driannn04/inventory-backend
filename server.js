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

const app = express();
const server = http.createServer(app);

// =============================
// SOCKET.IO CONFIGURATION
// =============================
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
});

global.onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("register", (user_id) => {
    const idStr = String(user_id);
    if (!global.onlineUsers[idStr]) {
      global.onlineUsers[idStr] = [];
    }
    global.onlineUsers[idStr].push(socket.id);
    console.log(`✅ User ${idStr} registered`);
  });

  socket.on("disconnect", () => {
    for (let user_id in global.onlineUsers) {
      global.onlineUsers[user_id] = global.onlineUsers[user_id].filter(id => id !== socket.id);
      if (global.onlineUsers[user_id].length === 0) delete global.onlineUsers[user_id];
    }
    console.log("❌ Client disconnected:", socket.id);
  });
});

global.io = io;

// =============================
// MIDDLEWARE
// =============================
app.use(cors({
  origin: "*", // Mengizinkan semua domain (termasuk Dev Tunnels)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(requestLogger);
app.use(timeLogger);
app.use(sanitizer);
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

// Error Handling
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Inventory Management API - Running");
});

// =============================
// SERVER START
// =============================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});