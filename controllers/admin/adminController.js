const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

//error page
const pageerror = async (req,res)=>{
    res.render("admin-error")
}


const loadLogin = (req, res) => {

    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("adminLogin", { message: null });
};
//admin function
const login =async (req,res)=>{
    try {
        const {email,password }=req.body;
        console.log(req.body)
        
        const admin = await User.findOne({email,isAdmin:true})
        console.log(admin)
        if(admin){

            const passwordMatch = bcrypt.compare(password,admin.password);
            console.log()
            if(passwordMatch){
                req.session.admin = true;
            return res.redirect("/admin/dashboard")
            }else {
                return res.redirect("/login")
            }
        }else{
            return res.redirect("/login")
        }
    } catch (error) {
        console.log("login error",error);
        return res.redirect("/pageerror")     
        
    }
};

const loadDashboard =async (req,res)=>{
    // if(req.session.admin){
    //     try {
    //         res.render("dashboard")
    //     } catch (error) {
    //         res.redirect("/pageerror")
    //     }
    // }

    res.render('dashboard')
}







module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
};
