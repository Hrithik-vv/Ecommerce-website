const User = require("../models/userSchema");

//user  auth
// const userAuth = (req, res, next) => {
//   if (res.session.user) {
//     User.findById(req.session.user)
//       .then((data) => {
//         if (data && !data.isBlocked) {
//           next();
//         } else {
//           res.redirect("/login");
//         }
//       })
//       .catch((error) => {
//         console.log("Error  in user auth middleware");

//         res.status(500).send("Internal Server error");
//       });
//   } else {
//     res.redirect("/login");
//   }
// };

const userAuth = (req, res, next) => {
  console.log("sessionn",req.session.user)
  if (req.session.user) {
    User.findById(req.session.user)
      .then((user) => {
        if (user) {
          if (user.isBlocked) {
            // Destroy the session if the user is blocked
            req.session.destroy((err) => {
              if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).send("Internal Server Error");
              }
              res.redirect("/login"); // Redirect to login
            });
          } else {
            next(); // Proceed to the next middleware or route
          }
        } else {
          res.redirect("/login"); // User not found
        }
      })
      .catch((error) => {
        console.error("Error in user auth middleware:", error);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/login"); // No user session exists
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


const already = (req, res,next)=>{
  console.log("buhnkj"+req.session.userAuthser);
  
  if(req.session.user){
   return res.redirect("/")
  }else{
   next()
  }
}


module.exports = {
  userAuth,
  adminAuth,
  already
};
