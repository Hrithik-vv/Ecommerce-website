const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        
    },
    description: {
        type: String,
        
    },
    brand: {
        type: String,
       
    },
    category: {
        type: String,
        
        ref: "Category",
        
    },
    salePrice: {
        type: Number,
        
    },
    productOffer: { // Fixed typo from "prooductOffer" to "productOffer"
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 1 // Changed from `true` to a numeric default value (e.g., 1)
    },
    color: {
        type: String,
        
    },
    productImage: {
        type: [String],
        
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"], // Fixed typo in enum values
       
        default: "Available"
    },
    image1:{
        type:String
    },
    image2:{
        type:String
    },
    image3:{
        type:String
    },
    image4:{
        type:String
    }
}, { timestamps: true });

// Correct usage of mongoose.model()
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
