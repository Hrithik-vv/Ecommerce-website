// routes/userRouter.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("../config/passport");
// const userAuth = require("../middlewares/")
// Error and Home
router.get("/pageNotFound", userController.pageNotFound);
router.get("/", userController.loadHomepage);

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

// User profile (Protected by userAuth)
// router.get("/userProfile", userAuth, userController.userProfile); // Protected route

module.exports = router;
