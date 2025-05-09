const User = require("../../models/userSchema");
const product = require("../../models/productSchema");
const env = require("dotenv").config(); 
const nodemailer = require("nodemailer"); 
const bcrypt = require("bcrypt");
const aswinfn = require("../../utils/nodemailer");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const OTP = require("../../models/otpschema");
const { generateReferralCode } = require("../../utils/referralUtils");
const Wallet = require("../../models/walletschema");

// error page
const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

//homepage loading
const loadHomepage = async (req, res) => {
  try {
    const products = await product
      .find({ isBlocked: false })
      .sort({ createdAt: -1 })
      .limit(4);
    const user = req.session.user;
    console.log(req.session);

    if (user) {
      const userData = await User.findOne({ _id: user._id });
      //user checking
      if (userData) {
        if (userData.isBlocked) {
          // If the user is blocked
          req.session.destroy((err) => {
            if (err) {
              console.error("Error destroying session:", err);
              return res.status(500).send("Internal Server Error");
            }
            return res.redirect("/login"); // Redirect to login
          });
        } else {
          // Render homepage for unblocked user
          return res.render("home", { user: userData, products });
        }
      } else {
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
      secure: false,
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
    const { name, email, password, cPassword, referralCode } = req.body;

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
    const otpEntry = new OTP({
      sessionId: req.session.id,
      otp,
    });

    await otpEntry.save();
    
    // Store referral code in session if provided
    req.session.userData = { name, email, password, referralCode };

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
    const sessionId = req.session.id;
    const userData = req.session.userData;

    const foundOtp = await OTP.findOne({ sessionId });

    if (!foundOtp) {
      return res.render("verify-otp", { message: "OTP expired" });
    }

    if (otp !== foundOtp.otp) {
      return res.render("verify-otp", { message: "Invalid OTP" });
    }

    const passwordHash = await securePassword(userData.password);
    
    // Generate a referral code for the new user
    const newReferralCode = generateReferralCode(userData.name);
    
    // Create new user with referral code
    const newUser = new User({
      name: userData.name,
      email: userData.email,
      password: passwordHash,
      referalCode: newReferralCode,
    });

    await newUser.save();
    
    // Process referral if a valid referral code was provided
    if (userData.referralCode) {
      const referrer = await User.findOne({ referalCode: userData.referralCode });
      
      if (referrer) {
        // Credit referrer's wallet (50 units)
        const REFERRAL_BONUS = 50;
        
        // Find or create wallet for referrer
        let wallet = await Wallet.findOne({ userId: referrer._id });
        
        if (!wallet) {
          wallet = new Wallet({
            userId: referrer._id,
            balance: 0,
            transactions: []
          });
        }
        
        // Add bonus amount
        wallet.balance += REFERRAL_BONUS;
        
        // Record transaction
        wallet.transactions.push({
          amount: REFERRAL_BONUS,
          type: 'credit',
          description: `Referral bonus for user ${newUser.email}`,
          date: new Date()
        });
        
        await wallet.save();
        
        // Update referrer's user model
        referrer.redeemedUsers = referrer.redeemedUsers || [];
        referrer.redeemedUsers.push(newUser._id);
        await referrer.save();
      }
    }

    // Clean up session
    await OTP.findOneAndDelete({ sessionId });
    delete req.session.userData;

    res.redirect("/login");
  } catch (error) {
    console.error("verify-otp error", error);
    res.redirect("/pageNotFound");
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

function resendOTP() {
  // Clear existing timer and reset values
  clearInterval(timerInterval);
  timer = 60;
  document.getElementById("otp").disabled = false;
  document.getElementById("timerValue").classList.remove("expired");
  document.getElementById("timerValue").textContent = timer;

  startTimer();

  // Send AJAX request to resend OTP
  $.ajax({
    type: "POST",
    url: "resend-otp",
    success: function (response) {
      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Resent Successfully",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while resending OTP. Please try again.",
        });
      }
    },
    error: function () {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to resend OTP. Please check your connection and try again.",
      });
    },
  });

  return false;
}

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
      res.clearCookie("connect.sid");
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};
const loadShoppingPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = userId ? await User.findById(userId) : null;
    const category = await Category.find({ isListed: true });
    const products = await Product.find({ isListed: true }).populate('category')

    // Initialize filters object with default values
    const filters = {
      selectedCategory: 'all',
      selectedSort: '',
      minPrice: '',
      maxPrice: '',
      search: ''
    };

    // Update filters from query parameters if they exist
    if (req.query.category) filters.selectedCategory = req.query.category;
    if (req.query.sort) filters.selectedSort = req.query.sort;
    if (req.query.minPrice) filters.minPrice = req.query.minPrice;
    if (req.query.maxPrice) filters.maxPrice = req.query.maxPrice;
    if (req.query.search) filters.search = req.query.search;

    res.render("shop", {
      user,
      category,
      products,
      filters
    });
  } catch (error) {
    console.error("Error in loadShoppingPage:", error);
    res.status(500).send("Internal Server Error");
  }
};


// fillter
const filterProduct = async (req, res) => {
  try {
    const user = req.session.user;
    const category = req.query.category;
    const findCategory = category
      ? await Category.findOne({ _id: category })
      : null;
    const query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    let findProducts = await Product.find(query).lean();
    findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    const categories = await Category.find({ isListed: true });

    let itemsPerPage = 6;

    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);
    let userData = null;
    if (user) {
      userData = await User.findOne({ _id: user });
      if (userData) {
        const searchEntry = {
          category: findCategory ? findCategory._id : null,
          searchedOn: new Data(),
        };
        userData.searchHistory.push(searchEntry);
        await userData.save();
      }
    }

    req.session.filterProduct = currentProduct;

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages,
      currentPage,
      selectedCategory: category || null,
    });
  } catch (error) {
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
  loadShoppingPage,
  filterProduct,
};
