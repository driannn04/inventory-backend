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
const opnameRoutes = require("./routes/opnameRoutes");
const auditRoutes = require("./routes/auditRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const userRoutes = require("./routes/userRoutes");
const kategoriRoutes = require("./routes/kategoriRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandle");
const timeLogger = require("./middlewares/timeLogger");

const morgan = require("morgan");

const app = express();
const server = http.createServer(app);

// =============================
// 🔥 SOCKET.IO INIT
// =============================
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 SIMPAN USER ONLINE (MULTI DEVICE SUPPORT)
global.onlineUsers = {}; // { user_id: [socketId, socketId] }

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("register", (user_id) => {
    if (!global.onlineUsers[user_id]) {
      global.onlineUsers[user_id] = [];
    }

    global.onlineUsers[user_id].push(socket.id);

    console.log("✅ User registered:", user_id);
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
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(requestLogger);
app.use(timeLogger);
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
app.use("/api/opname", opnameRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/users", userRoutes);
app.use("/api/kategori", kategoriRoutes);
app.use("/api/settings", settingsRoutes);

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
server.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});