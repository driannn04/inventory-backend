const express = require("express");
const router = express.Router();
const kategoriController = require("../controllers/kategoriController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

router.get("/", verifyToken, kategoriController.getKategori);
router.get("/:id", verifyToken, kategoriController.getKategoriById);
router.post("/", verifyToken, allowRoles("admin"), kategoriController.createKategori);
router.put("/:id", verifyToken, allowRoles("admin"), kategoriController.updateKategori);
router.delete("/:id", verifyToken, allowRoles("admin"), kategoriController.deleteKategori);

module.exports = router;
