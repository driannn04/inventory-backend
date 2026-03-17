const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const barangRoutes = require("./routes/barangRoutes");
const pengajuanRoutes = require("./routes/pengajuanRoutes");
const stokRoutes = require("./routes/stokRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const laporanRoutes = require("./routes/laporanRoutes");
const exportRoutes = require("./routes/exportRoutes");
const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandle");
const timeLogger = require("./middlewares/timeLogger");



const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(requestLogger);
app.use(errorHandler);
app.use(timeLogger);
app.use("/uploads",express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/stok",stokRoutes);    
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/laporan",laporanRoutes);
app.use("/api/export",exportRoutes);


app.get("/", (req, res) => {
    res.send("API Inventory Gudang PDAM");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});