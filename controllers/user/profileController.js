const User = require("../../models/userSchema"); //MONGO USER SCHEMA
const Address = require("../../models/addressSchema");
const env = require("dotenv").config(); //variable configuration
const nodemailer = require("nodemailer"); // sending email
const bcrypt = require("bcrypt"); //hashing
const aswinfn = require("../../utils/nodemailer"); //utilite  function for email sending
const session = require("express-session");
const { options } = require("../../routes/userRouter");
const address = require("../../models/addressSchema");

const Wallet = require("../../models/walletSchema");

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
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });
    const walletData = await Wallet.findOne({ userId: userId });

    res.render("profile", {
      user: userData,
      userAddress: addressData,
      wallet: walletData
    });
  } catch (error) {
    console.error("Error for retrieve profile data", error);
    res.redirect("/pageNotFound"); 
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
    res.render("change-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const changePasswordValid = async (req, res) => {
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
        res.render("change-pasword-otp");
        console.log("OTP:", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to send OTP. Please try again",
        });
      }
    } else {
      res.render("change-password");
      message: "User with this email does not exist";
    }
  } catch (error) {
    console.log("Error in change password validation", error);
    res.redirect("/pageNotFound");
  }
};

const verifyChangePassOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    console.log("entered", enteredOtp);
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occured. Pleacse try again leter",
    });
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
console.log(addressType)
if (!addressType || !name || !city || !state || !pincode || !phone) {
  console.log("Missing required fields:", { addressType, name, city, state, pincode, phone });
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
    console.log("Request Body:", req.body,"usydghsbzjkjfbijk");
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

module.exports = { deleteAddress };

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
  verifyChangePassOtp,
  addAddress,
  postAddAddress,
  editAddress,
  postEditAddress,
  deleteAddress,
};
