const User = require("../models/userSchema");

//user  auth
const userAuth = (req, res, next) => {
  if (res.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((error) => {
        console.log("Error  in user auth middleware");

        res.status(500).send("Internal Server error");
      });
  } else {
    res.redirect("/login");
  }
};

//admin auth
const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/adim/login");
      }
    })
    .catch((error) => {
      console.log("Error in adminauth middillleware", error);
      res.status(500).send("Internal Server Error");
    });
};

module.exports = {
  userAuth,
  adminAuth,
};
