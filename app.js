const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config(); // Loads environment variables
const session = require("express-session"); // Express session middleware for session management
const passport = require("./config/passport"); // Passport configuration
const connectDB = require("./config/db"); // Database connection setup
const userRouter = require("./routes/userRouter"); // User routes
const GoogleStrategy = require("passport-google-oauth20").Strategy; // Google OAuth
const adminRouter = require("./routes/adminRouter"); // Admin routes
const nocache = require("nocache");
const flash = require('connect-flash');
const Cart = require("./models/cartSchema");
const { ensurePortIsFree } = require('./utils/portUtils'); // Import port utilities

// Database connection
connectDB();

// Middleware to parse JSON and URL-encoded data in requests
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(nocache());

// Middleware to Set `res.locals.user`
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Set ejs as view engine for rendering dynamic views
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);
app.use(express.static(path.join(__dirname, "public")));

// Define Routes
app.use("/", userRouter);
// Admin Router
app.use("/admin", adminRouter);

// Serve static uploads
app.use("/uploads", express.static("uploads"));

// Define the PORT variable for reference
const PORT = process.env.PORT || 3000;

// Routes
app.get("/check-session", (req, res) => {
  if (req.session.user) {
    res.send("User is logged in.");
  } else {
    res.send("No session found.");
  }
});

// Ensure you are passing categories to the view
app.get("/admin/addproduct", (req, res) => {
  Category.find({}, (err, categories) => {
    if (err) throw err;
    res.render("admin/addproduct", { categories });
  });
});

app.get("/admin/product", async (req, res) => {
  const products = await this.product.find();
  res.render("admin/product", { product });
});

app.use(flash());

// Add this middleware to make cart count available to all views
app.use(async (req, res, next) => {
  if (req.user) {
    try {
      const cart = await Cart.findOne({ userId: req.user._id });
      res.locals.cartCount = cart ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
    } catch (error) {
      console.error('Cart count middleware error:', error);
      res.locals.cartCount = 0;
    }
  } else {
    res.locals.cartCount = 0;
  }
  next();
});

// 404 Page Not Found middleware - This must be after all routes
app.use((req, res) => {
  res.status(404).render("page-404");	
});

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error:", err.message);
        return res.redirect("/pageNotFound");
      }
      res.clearCookie("connect.sid");
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = app;
