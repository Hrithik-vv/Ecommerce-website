const User = require("../../models/userSchema"); //MONGO USER SCHEMA
const env = require("dotenv").config(); //variable configuration
const nodemailer = require("nodemailer"); // sending email
const bcrypt = require("bcrypt"); //hashing
const aswinfn = require("../../utils/nodemailer"); //utilite  function for email sending
const session = require("express-session");

// otp global  fuction
function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subjectc: "You OTP for password rest",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4><br></b>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

//user profile
const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userDate = await User.findById(userId);
    res.render("profile", {
      user: userDate,
    });
  } catch (error) {
    console.error("Error for retrieve profile data", error);
    res.redirect("/pageNotFound");
  }
};

const getForgotPassPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.redirect("/pageNOtFound");
  }
};

const forgotEmailValid = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgotPass-opt.ejs");
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          messag: "Faild to send OTP. Please try again",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exixt",
      });
    }
  } catch (error) {
    res.redirect("pagenNotFounf");
    console.log("forgot email validate error", error);
  }
};

const verifyForgotPassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, messag: "An error occured. Please try again" });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("Reset password error", error);
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("Resending OTP to email:", email);
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res.status(200).json({ success: true, message: "Resend OTP Successful" });
    }
  } catch (error) {
    console.error("Error in resendd otp", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  userProfile,
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
};
