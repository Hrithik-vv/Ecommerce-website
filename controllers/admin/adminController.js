const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); //password hashing and comparison

//error page
const pageerror = async (req, res) => {
  res.render("admin-error");
};

//to render the admin login page
const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("adminLogin", { message: null });
};

//dmin login functionality
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    // Find the user 
    const admin = await User.findOne({ email, isAdmin: true });
    console.log(admin);

    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password); // Add `await` here
      console.log();

      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("admin/dashboard");
      } else {
        return res.redirect("/login");
      }
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("pageerror");
  }
};


//to load the admin dashboard
const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      res.render("dashboard");
    } catch (error) {
      res.redirect("/pageerror");
    }
  }
  // res.render('dashboard')
};

//Admin Logout
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session", err);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("unexpected error during lgout", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};
