const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController"); 
const customerController = require("../controllers/admin/customerContoller")
const {userAuth,adminAuth}= require("../middlewares/auth")




router.get("/pageerror",adminController.pageerror)
//login Management
router.get("/login", adminController.loadLogin);
router.post("/login",adminController.login)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
//Customer Management
router.get("/users",adminAuth,customerController.customerInfo)
router.get ("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get ("/unblockCustomer",adminAuth,customerController.customerunBlocked)






module.exports = router;
