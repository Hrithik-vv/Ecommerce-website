const express =require("express")
const app =express();
require("dotenv").config();
const connectDB = require("./config/db");
// Call the function to connect to MongoDB
connectDB();


app.listen(3000, ()=>{
    console.log("Server Running on port 3000");
    
})

module.exports = app;
