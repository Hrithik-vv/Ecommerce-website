const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
const profileController = require("../controllers/user/profileController");
const { userAuth, already } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const wishlistController = require("../controllers/user/wishlistController");
const {
  createOrder,
  processPayment,
  loadOrderHistory,
  cancelOrder,
  returnOrder,
  processWalletPayment,
  checkWalletBalance,
} = require("../controllers/user/orderController");
const auth = require("../middlewares/auth");
const couponController = require("../controllers/admin/couponController");
const orderController = require("../controllers/user/orderController");

// Make sure all required functions are exported from cartController
const {
  loadCheckoutPage,
  processCheckout,
  // ... other functions
} = require("../controllers/user/cartController");

// Error and Home
router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);
router.get("/shop", userController.loadShoppingPage);
router.get("/filter", userController.filterProduct);

// User Signup
router.get("/signup", already, userController.loadSignup);
router.post("/signup", already, userController.signup);

// OTP Verification
router.get("/verify-otp", already, userController.loadOtpPage);
router.post("/verify-otp", already, userController.verifyOtp);
router.post("/resend-otp", already, userController.resendOtp);

// Google Authentication

const preventAuthPageAccess = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/'); 
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};

router.get("/auth/google", preventAuthPageAccess, passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  async (req, res) => {
    req.login(req.user, (err) => {
      if (err) {
        return res.redirect("/signup");
      }
      req.session.user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      };

      // Prevent caching of authenticated pages
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      return res.redirect("/");
    });
  }
);



//Product management
router.get("/productDetails", productController.productDetails);

// User Login Routes
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//profile management
router.get("/forgot-password", profileController.getForgotPassPage);
router.post("/forgot-email-valid", profileController.forgotEmailValid);
router.post("/verify-passForgot-otp", profileController.verifyForgotPassOtp);
router.get("/reset-password", profileController.getResetPassPage);
router.post("/resend-forgot-otp", profileController.resendOtp);
router.post("/reset-password", profileController.postNewPassword);
router.get("/userProfile", userAuth, profileController.userProfile);
router.get("/change-email", userAuth, profileController.changeEmail);
router.get("/direct-email-change", userAuth, profileController.directEmailChange);
router.post("/change-email", userAuth, profileController.changeEmailValid);
router.post("/verify-email-otp", userAuth, profileController.verifyEmailOtp);
router.post("/update-email", userAuth, profileController.updateEmail);
router.get("/change-password", userAuth, profileController.changePassword);
router.post(
  "/change-password",
  userAuth,
  profileController.changePasswordValid
);

//Address Management
router.get("/addAddress", userAuth, profileController.addAddress);
router.post("/addAddress", userAuth, profileController.postAddAddress);
router.get("/editAddress", userAuth, profileController.editAddress);
router.post("/editAddress", userAuth, profileController.postEditAddress);
router.get("/deleteAddress", userAuth, profileController.deleteAddress);

//Cart Management
router.get("/shopping-cart", userAuth, cartController.viewCart);
router.post("/shopping-cart", userAuth, cartController.addToCart);
router.get(
  "/remove-from-cart/:productId",
  userAuth,
  cartController.removeFromCart
);
router.post("/cart/update", cartController.updateQuantity);
router.post("/cart/add", userAuth, cartController.addToCart);
//filte
router.get("/shop", productController.getProducts);
router.get("/shop/filter", productController.getProducts);

// Checkout Routes
router.all("/checkout", userAuth, cartController.checkoutController);

//WishList Management
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/addToWishlist", userAuth, wishlistController.addToWishlist);
router.get("/removeFromWishlist", userAuth, wishlistController.removeProduct);

//Razorpay management
router.post("/create-razorpay-order", userAuth, createOrder);
// router.post("/verify-payment", userAuth, processPayment);

router.get("/order-placed", userAuth, (req, res) => {
  res.render("orderPlaced", {
    orderId: req.query.orderId,
    paymentId: req.query.paymentId,
  });
});

// Coupon routes
router.post("/apply-coupon", couponController.applyCoupon);

//order
router.get("/order-history", userAuth, loadOrderHistory);
router.post("/cancel-order", userAuth, cancelOrder);
router.post("/return-order/:orderId", userAuth, returnOrder);
router.get("/order-view", userAuth, cartController.orderView);

// Add this route to your userRouter.js file
router.post("/process-payment", userAuth, orderController.processPayment);

// Wallet payment route
router.post("/process-wallet-payment", userAuth, orderController.processWalletPayment);

// Check wallet balance
router.get("/check-wallet-balance", userAuth, async (req, res) => {
  try {
    const userId = req.user ? req.user._id : req.session.user;
    const balance = await orderController.checkWalletBalance(userId);
    res.json({ success: true, balance });
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    res.status(500).json({ success: false, message: "Error checking wallet balance" });
  }
});

// Return product route
router.post("/return-product", userAuth, async (req, res) => {
  try {
    await orderController.returnProduct(req, res);
  } catch (error) {
    console.error("Error in return product route:", error);
    req.flash(
      "error",
      "An error occurred while processing your return request"
    );
    res.redirect("/order-history");
  }
});


router.post('/payment-failed',orderController.paymentFailed);
router.post('/retry-payment',orderController.retryPayment);
router.post('/update-payment-status',orderController.updatePaymentStatus);
module.exports = router;
