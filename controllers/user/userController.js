// const { options } = require("../../app");
const User = require("../../models/userSchema"); //MONGO USER SCHEMA
const product = require("../../models/productSchema");
const env = require("dotenv").config(); //variable configuration
const nodemailer = require("nodemailer"); // sending email
const bcrypt = require("bcrypt"); //hashing
const aswinfn = require("../../utils/nodemailer"); //utilite  function for email sending

// error page
const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// //load home with or whithout user
// const loadHomepage = async (req, res) => {
//   const products = await product.find({isBlocked:false})
// console.log(products);

  
//   try {
//     const user = req.session.user;
//     if (user) {
//       const userData = await User.findOne({ _id: user._id ,isBlocked:false});
//       res.render("home", { user: userData ,products});
//     } else {
//       return res.render("home", { user ,products});
//     }
//   } catch (error) {
//     console.log("Home page not found");
//     res.status(500).send("Server error");
//   }
// };
const loadHomepage = async (req, res) => {
  try {
    const products = await product.find({ isBlocked: false }); // Fetch unblocked products
    const user = req.session.user;

    if (user) {
      const userData = await User.findOne({ _id: user._id });

      if (userData) {
        // If user exists and is blocked
        if (userData.isBlocked) {
          req.session.destroy((err) => {
            if (err) {
              console.error("Error destroying session:", err);
              return res.status(500).send("Internal Server Error");
            }
            return res.redirect("/login"); // Redirect blocked user to login
          });
        } else {
          // Render homepage for unblocked user
          return res.render("home", { user: userData, products });
        }
      } else {
        // If user is not found
        return res.redirect("/login");
      }
    } else {
      // Render homepage for guest users
      return res.render("home", { user: null, products });
    }
  } catch (error) {
    console.error("Error loading homepage:", error);
    res.status(500).send("Server Error");
  }
};


// signup page
const loadSignup = async (req, res) => {
  try {
    return res.render("signup", { message: "" });
  } catch {
    console.log("Home page loading:", error);
    res.status(500).send("Server error");
  }
};

// otp generator
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
//  Send verification email with OTP
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      html: `<b>Your OTP: ${otp}</b>`,
    });

    console.log("Email sent successfully");

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

//handle user signup
const signup = async (req, res) => {
  try {
    const { name, email, password, cPassword } = req.body;

    if (password !== cPassword) {
      return res.render("signup", { message: "Password do not match" }); // Validate passwords
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exist",
      });
    }
    const otp = generateOtp();

    const emailSent = await aswinfn(otp, email);
    console.log(emailSent);
    if (!emailSent) {
      return res.json("email-error");
    }
    // Save OTP and user data
    req.session.userOtp = otp;
    req.session.userData = { name, email, password };
    

    // res.render("verify-otp",{message:''});
    res.redirect("/verify-otp");
    console.log("OTP sent", otp);
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFount");
  }
};

// Render OTP verification page
const loadOtpPage = async (req, res) => {
  try {
    res.render("verify-otp", { message: "" });
  } catch (error) {}
};

// Hash password using
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    return passwordHash;
  } catch (error) {}
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log(otp === req.session.userOtp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      console.log(user);
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        // phone: user.phone,
        password: passwordHash,
      });
      await saveUserData.save();
      // req.session.user = saveUserData._id;
      req.session.user = saveUserData;

      res.redirect("/");
    } else {
      res.status(400).render("verify-otp", { message: "OTP invalid" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const user = req.session.userData;

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    const otp = generateOtp();
    const emailSent = await aswinfn(otp, user.email);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Try again later.",
      });
    }

    req.session.userOtp = otp;
    console.log("Resent OTP:", otp);

    res
      .status(200)
      .json({ success: true, message: "OTP resent successfully." });
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({ success: false, message: "An error occurred." });
  }
};

// Render login page
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("pageNotFound");
  }
};

// Handle user login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" });
    }

    req.session.user = findUser;

    req.session.userId = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed. Please try again later" });
  }
};

// logout  
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => { 
      if (err) {
        console.log("Session destruction error:", err.message);
        return res.redirect("/pageNotFound");
      }
      // After session is destroyed, clear the session cookie
      res.clearCookie("connect.sid"); // "connect.sid" is the default session cookie name
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};


module.exports = { 
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  loadOtpPage,
  loadLogin,
  login,
  resendOtp,
  logout,
};
