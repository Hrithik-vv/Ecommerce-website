const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            quantity: {
                type: Number,
                default: 1,  // Default quantity set to 1
                min: 1        // Ensures at least 1 quantity
            },
            productPrice: {
                type: Number,
                required: true
            },
            totalPrice: {
                type: Number,
                required: true
            },
            status: {
                type: String,
                default: "Placed"
            },
            cancellationReason: {
                type: String,
                default: "none"  // Fixed typo from "defult"
            }
        }
    ]
}, { timestamps: true });

// Prevent OverwriteModelError
const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

module.exports = Cart;
