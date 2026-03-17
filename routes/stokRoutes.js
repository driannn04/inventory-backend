const express = require("express");
const router = express.Router();

const {
tambahStokMasuk,
getStokMasuk,
tambahStokKeluar,
getStokKeluar
} = require("../controllers/stokController");

// stok masuk
router.post("/masuk",tambahStokMasuk);
router.get("/masuk",getStokMasuk);

// stok keluar
router.post("/keluar",tambahStokKeluar);
router.get("/keluar",getStokKeluar);

module.exports = router;