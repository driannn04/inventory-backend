const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken, allowRoles } = require("../middlewares/auth");
const activityLogger = require("../middlewares/activityLogger");

// =============================
// SEMUA ROLE: PROFIL SENDIRI (HARUS DI ATAS /:id)
// =============================
router.get("/profile/me", verifyToken, userController.getMyProfile);
router.put("/profile/me", verifyToken, userController.updateMyProfile);
router.put("/profile/change-password", verifyToken, userController.changeMyPassword);

// =============================
// MASTER DATA: JABATAN, DEPARTEMEN, SUB-DEPT
// =============================
router.get("/jabatans", verifyToken, userController.getJabatans);
router.get("/departments", verifyToken, userController.getDepartments);
router.get("/departments/:id/sub", verifyToken, userController.getSubDepartments);

// =============================
// ADMIN ONLY: KELOLA USER
// =============================
router.get("/", verifyToken, allowRoles("admin"), userController.getUsers);
router.get("/next-nup", verifyToken, allowRoles("admin"), userController.getNextNup);
router.get("/roles", verifyToken, allowRoles("admin"), userController.getRoles);
router.post("/", verifyToken, allowRoles("admin"), activityLogger("Tambah", "User"), userController.createUser);
router.put("/:id", verifyToken, allowRoles("admin"), activityLogger("Edit", "User"), userController.updateUser);
router.delete("/:id", verifyToken, allowRoles("admin"), activityLogger("Hapus", "User"), userController.deleteUser);
router.put("/:id/reset-password", verifyToken, allowRoles("admin"), userController.resetPassword);
router.get("/:id", verifyToken, allowRoles("admin"), userController.getUserById);

module.exports = router;
