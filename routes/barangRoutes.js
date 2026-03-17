const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const barangController = require("../controllers/barangController");

router.get("/",barangController.getBarang);
router.get("/:id",barangController.getBarangById);

router.post("/",upload.single("foto"),barangController.tambahBarang);

router.put("/:id", upload.single("foto"), barangController.updateBarang);
router.delete("/:id",barangController.deleteBarang);

router.get("/qr/:id",barangController.generateQR);
router.get("/search",barangController.searchBarang);
router.get("/stok-minimum",barangController.getStokMinimum);
router.get("/pagination",barangController.getBarangPagination);

router.get("/qr/download/:id",barangController.downloadQR);

// endpoint lama (boleh tetap ada sementara)
router.post("/create",upload.single("foto"),barangController.createBarang);

module.exports = router;