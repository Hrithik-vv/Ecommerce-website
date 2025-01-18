// const User = require("../../models/userSchema"); //MONGO USER SCHEMA
// const env = require("dotenv").config(); //variable configuration
// const nodemailer = require("nodemailer"); // sending email
// const bcrypt = require("bcrypt"); //hashing
// const aswinfn = require("../../utils/nodemailer"); //utilite  function for email sending


// //user profile
// const userProfile = async (req,res)=>{
//     try{

//         const userId = req.session.user;
//         const userDate = await User.findById(userId);
//         res.render('profile',{
//             user:userDate,
//         })
//     } catch (error){

//         console.error("Error for retrieve profile data",error);
//         res.redirect("/pageNotFound")
//     }
// } 


// module.exports = {
//     userProfile
// }