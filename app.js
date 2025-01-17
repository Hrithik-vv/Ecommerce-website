const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();  // Loads environment variables
const session = require("express-session");  // Express session middleware for session management
const passport = require("./config/passport"); // Passport configuration
const connectDB = require("./config/db"); // Database connection setup
const userRouter = require("./routes/userRouter");// User routes
const GoogleStrategy = require("passport-google-oauth20").Strategy; // Google OAuth
const adminRouter = require("./routes/adminRouter");// Admin routes

connectDB();

// Middleware to parse JSON and URL-encoded data in requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// Middleware to Set `res.locals.user`
app.use((req, res, next) => {
  res.locals.user = req.session.user || "aaaahaaa"; // Assign user to locals for templates
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

// Start Server
const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => {
  console.log("Server Running on port 3000");
});

module.exports = app;
