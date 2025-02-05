const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerContoller");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productCotroller");
const addproductConroller = require("../controllers/admin/addproductController");
const orderConroller = require("../controllers/admin/orderController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const  {updateOrderStatus }  = require('../controllers/admin/orderController');
const couponController = require("../controllers/admin/couponController")



// Multer setup
const multer = require("multer");
const storage = require("../helpers/multer");
const upload = multer({ storage: storage }); // Create the upload middleware

// Error Management
router.get("/pageerror", adminController.pageerror);

// Login Management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// Customer Management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

// Brand Management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", upload.single("image"), brandController.addBrand);

// Product Management R
router.get("/product", adminAuth, productController.loadproduct);
router.get("/addproduct", adminAuth, addproductConroller.loadaddproduct);
router.post("/addproduct", adminAuth, addproductConroller.addproduct);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, addproductConroller.editProduct);
router.post(
  "/product/:productId/image/:imageNumber'",
  addproductConroller.deleteProductImage
);

router.get("/ordermanage",orderConroller.adminOrderView)
router.post('/update-order-status', updateOrderStatus);


//Coupon Management
router.get("/coupon",adminAuth,couponController.loadCoupon);
router.post("/createCoupon",adminAuth,couponController.createCoupon)
router.get("/editCoupon",adminAuth,couponController.editCoupon)
router.post("/updateCoupon",adminAuth,couponController.updateCoupon)

module.exports = router;
