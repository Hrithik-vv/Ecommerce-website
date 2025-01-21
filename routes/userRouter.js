const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
const profileController  =require("../controllers/user/profileController")
const {userAuth}=require("../middlewares/auth")
// Error and Home
router.get("/pageNotFound", userController.pageNotFound);
router.get("/",userController.loadHomepage);

// User Signup
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);

// OTP Verification
router.get("/verify-otp", userController.loadOtpPage);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

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

// User Login Routes
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);

//profile management
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage);
router.post("/resend-forgot-otp",profileController.resendOtp);
// User profile (Protected by userAuth)
// router.get("/userProfile", userAuth, userController.userProfile); // Protected route
module.exports = router;
