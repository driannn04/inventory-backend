const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const { verifyToken, allowRoles } = require("../middlewares/auth");

// Hanya Admin yang bisa kelola Supplier
router.get("/", verifyToken, allowRoles("admin", "gudang"), supplierController.getSuppliers);
router.post("/", verifyToken, allowRoles("admin"), supplierController.createSupplier);
router.put("/:id", verifyToken, allowRoles("admin"), supplierController.updateSupplier);
router.delete("/:id", verifyToken, allowRoles("admin"), supplierController.deleteSupplier);

module.exports = router;
