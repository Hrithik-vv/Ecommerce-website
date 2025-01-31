const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Render the error page
const pageerror = async (req, res) => {
  res.render("admin-error");
};

// Render the admin login page
const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("adminLogin", { message: null });
};

// Admin login functionality
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    // Find the admin user
    const admin = await User.findOne({ email, isAdmin: true });

    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
      } else {
        return res.render("adminLogin", { message: "Invalid password." });
      }
    } else {
      return res.render("adminLogin", { message: "Admin not found." });
    }
  } catch (error) {
    console.log("Login error", error);
    return res.redirect("/pageerror");
  }
};

// Load the admin dashboard
const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      res.render("dashboard");
    } catch (error) {
      res.redirect("/pageerror");
    }
  } else {
    return res.redirect("/admin/login"); // Redirect to login if not authenticated
  }
};

// Admin logout
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
    console.log("Unexpected error during logout", error);
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
