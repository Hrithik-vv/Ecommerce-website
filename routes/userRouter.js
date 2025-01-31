const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
const profileController = require("../controllers/user/profileController");
const { userAuth, already } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");

const cartController = require('../controllers/user/cartController');


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
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
// Google callback route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signup", // Redirect to signup page on failure
  }),
  (req, res) => {
    // Successful authentication, log the user in and redirect to home page
    req.login(req.user, (err) => {
      if (err) {
        return res.redirect("/signup"); // If login fails, redirect to signup
      }

      // After login, set the user session manually if not already set
      req.session.user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      };

      // Redirect to home page or dashboard
      res.redirect("/");
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
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail);
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp);

//Address Management
router.get("/addAddress",userAuth,profileController.addAddress);
router.post("/addAddress",userAuth,profileController.postAddAddress);
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress);
router.get("/deleteAddress",userAuth,profileController.deleteAddress)

//Cart Management
router.get("/shopping-cart", userAuth,cartController.viewCart);
router.post("/shopping-cart", userAuth, cartController.addToCart);
router.get("/remove-from-cart/:productId", userAuth, cartController.removeFromCart);
router.post('/cart/update', cartController.updateQuantity);
//filte
router.get("/shop",productController.getProducts)


// Checkout Routes
router.get("/checkout", userAuth, cartController.loadCheckoutPage);
router.post('/place-order',userAuth, cartController.processCheckout);


module.exports = router;
