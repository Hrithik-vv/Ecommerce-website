const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
const profileController = require("../controllers/user/profileController");
const { userAuth, already } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
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
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),

  (req, res) => {
    res.redirect("/");
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
// User profile (Protected by userAuth)
// router.get("/userProfile", userAuth, userController.userProfile); // Protected route
module.exports = router;
