const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const userRouter = require("./routes/userRouter");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware to Set `res.locals.user`
app.use((req, res, next) => {
    res.locals.user = req.session.user || "aaaahaaa"; // Assign user to locals for templates
    next();
});

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, "public")));

// Define Routes
app.use("/", userRouter);

// Start Server
const PORT = 3000 || process.env.PORT;
app.listen(PORT, () => {
    console.log("Server Running on port 3000");
});

module.exports = app;
