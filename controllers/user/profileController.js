const User = require("../../models/userSchema"); 
const Address = require("../../models/addressSchema");
const env = require("dotenv").config(); 
const nodemailer = require("nodemailer"); 
const bcrypt = require("bcrypt");
const aswinfn = require("../../utils/nodemailer"); 
const session = require("express-session");
const { options } = require("../../routes/userRouter");
const address = require("../../models/addressSchema");

const Wallet = require("../../models/walletschema")
  const Order = require("../../models/orderSchema");

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

const securePassword = async (password) => {
  try {
    const passwdHash = await bcrypt.hash(password, 10);
    return passwdHash;
  } catch (error) {}
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

const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 === newPass2) {
      const passwdHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwdHash } }
      );
      res.redirect("/login");
    } else {
      res.render("rest-password", { message: "Passwords do not match" });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const userProfile = async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    // Fetch user data
    const userData = await User.findById(userId).populate('redeemedUsers');
    
    // Generate referral code if user doesn't have one
    if (!userData.referalCode) {
      const { generateReferralCode } = require('../../utils/referralUtils');
      userData.referalCode = generateReferralCode(userData.name);
      await userData.save();
    }
    
    // Fetch wallet data with default empty values if not found
    const wallet = await Wallet.findOne({ userId }) || {
      balance: 0,
      transactions: []
    };

    // Fetch address data
    const addresses = await address.find({ userId });
    
    // Fetch orders
    const orders = await Order.find({ userId })
      .populate('products.productId')
      .sort({ createdAt: -1 });

    // Get the site's base URL from environment or use default
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    res.render('profile', {
      user: userData,
      wallet: wallet,  // This will now always have a value
      addresses: addresses,
      orders: orders,
      baseUrl: baseUrl
    });

  } catch (error) {
    console.error('Error in userProfile:', error);
    res.status(500).render('error', {
      message: 'Error loading profile',
      error: error
    });
  }
};

const changeEmail = async (req, res) => {
  try {
    res.render("change-email");
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("change email error", error);
  }
};

const directEmailChange = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userData = await User.findById(userId);
    const email = userData.email;
    
    const otp = generateOtp();
    const emailSent = await sendVerificationEmail(email, otp);
    
    if (emailSent) {
      req.session.userOtp = otp;
      req.session.email = email;
      req.session.userData = { email };
      res.render("change-email-otp");
      console.log("Email sent:", email);
      console.log("OTP:", otp);
    } else {
      res.status(500).send("Failed to send OTP email");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("direct email change error", error);
  }
};

const changeEmailValid = async (req, res) => {
  try {
    const { email } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;
        res.render("change-email-otp");
        console.log("Email sent:", email);
        console.log("OTP:", otp);
      } else {
        res.json("email-error");
      }
    } else {
      res.render("change-email");
      message: "User with this email not exist";
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    console.log("change email validation error", error);
  }
};

const verifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      req.session.userData = req.body.userData;
      res.render("new-email", {
        userData: req.session.userData,
      });
    } else {
      res.render("change-email-otp", {
        message: "OTP not matching",
        userData: req.session.userData,
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.redirect("/userProfile");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const changePassword = async (req, res) => {
  try {
    // Check if there are any success or error messages in the session
    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;
    
    // Clear the messages from session after retrieving them
    req.session.successMessage = undefined;
    req.session.errorMessage = undefined;
    
    res.render("change-password", { 
      message: errorMessage,
      successMessage: successMessage 
    });
  } catch (error) {
    console.error("Error loading change password page:", error);
    res.redirect("/pageNotFound");
  }
};

const changePasswordValid = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.session.user._id;
    
    // Validate the passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.session.errorMessage = "All fields are required";
      return res.redirect("/change-password");
    }
    
    if (newPassword !== confirmPassword) {
      req.session.errorMessage = "New password and confirm password do not match";
      return res.redirect("/change-password");
    }
    
    if (newPassword.length < 6) {
      req.session.errorMessage = "Password must be at least 6 characters long";
      return res.redirect("/change-password");
    }
    
    // Get user data
    const userData = await User.findById(userId);
    if (!userData) {
      return res.redirect("/login");
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch) {
      req.session.errorMessage = "Current password is incorrect";
      return res.redirect("/change-password");
    }
    
    // Hash the new password
    const hashedPassword = await securePassword(newPassword);
    
    // Update the password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    
    // Set success message in session and redirect
    req.session.successMessage = "Password changed successfully!";
    res.redirect("/change-password");
    
  } catch (error) {
    console.error("Error in change password validation:", error);
    req.session.errorMessage = "An error occurred. Please try again.";
    res.redirect("/change-password");
  }
};

//Address
const addAddress = async (req, res) => {
  try {
    const user = req.session.user;
    res.render("add-address", { user: user });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;
    console.log(addressType);
    if (!addressType || !name || !city || !state || !pincode || !phone) {
      console.log("Missing required fields:", {
        addressType,
        name,
        city,
        state,
        pincode,
        phone,
      });
      return res.status(400).send("All fields are required");
    }

    const existingAddress = await Address.findOne({ userId: userData._id });

    const newAddressData = {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    };

    if (existingAddress) {
      // If address document exists, push the new address to the array
      await Address.updateOne(
        { userId: userData._id },
        { $push: { address: newAddressData } }
      );
    } else {
      // If no existing document, create a new one
      const newAddress = new Address({
        userId: userData._id,
        address: [newAddressData],
      });
      await newAddress.save();
    }

    console.log("Address added successfully");

    res.redirect("/userProfile");
  } catch (error) {
    console.log("Error adding address", error);
    res.redirect("/pageNotFound");
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const user = req.session.user;
    const currAddress = await Address.findOne({
      "address._id": addressId,
    });

    if (!currAddress) {
      return res.redirect("/pageNotFound");
    }

    const addressData = currAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addressData) {
      return res.redirect("/pageNotFound");
    }
    res.render("edit-address", { address: addressData, user: user });
  } catch (error) {
    console.error("Error in edit address", error);
    res.redirect("/PageNotFound");
  }
};

const postEditAddress = async (req, res) => {
  try {
    const data = req.body;
    console.log("Request Body:", req.body, "usydghsbzjkjfbijk");
    const addressId = req.query.id;
    const user = req.session.user;
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      res.redirect("/pageNotFound");
    }
    await address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$": {
            _id: addressId,
            addressType: data.addressType,
            name: data.name,
            city: data.city,
            landMark: data.landMark,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            altPhone: data.altPhone,
          },
        },
      }
    );
    res.redirect("/userProfile");
  } catch (error) {
    console.error("Error in edit address", error);
    res.redirect("/pageNotFound");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;

    if (!addressId) {
      return res.status(400).send("Address ID is required");
    }

    // Check if the address exists
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(404).send("Address not found");
    }

    // Delete the address
    await Address.updateOne(
      { "address._id": addressId },
      {
        $pull: {
          address: {
            _id: addressId,
          },
        },
      }
    );

    // Redirect to the user profile
    res.redirect("/userProfile");
  } catch (error) {
    console.error("Error in delete address", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  verifyForgotPassOtp,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  userProfile,
  changeEmail,
  changeEmailValid,
  verifyEmailOtp,
  updateEmail,
  changePassword,
  changePasswordValid,
  addAddress,
  postAddAddress,
  editAddress,
  postEditAddress,
  deleteAddress,
  directEmailChange,
};
