const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    salePrice: {
        type: Number,
        required: true
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
        required: true
    },
    productImage: {
        type: [String],
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["Available", "out of stock", "Discontinued"], // Fixed typo in enum values
        required: true,
        default: "Available"
    }
}, { timestamps: true });

// Correct usage of mongoose.model()
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
