const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid"); 
const orderSchema = new Schema({
    orderId: {
        type: String,
        default: uuidv4,
    },
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    couponId: {
        type: String
    },
    products: [{  
        productId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Product', 
            required: true 
        },
        name: { type: String, required: true },
        variantId: { type: String },
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        color: { type: String },
        size: { type: String },
        status: { 
            type: String,
            required: true,
            enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
            default: 'Pending'
        },
        isReturned: {
            type: Boolean,
            default: false
        },
        returnReason: {
            type: String,
            enum: ['Wrong Size', 'Damaged Product', 'Not as Described', 'Quality Issues', 'Other']
        },
        returnComments: {
            type: String
        },
        returnStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: null
        },
        returnRequestDate: {
            type: Date
        }
    }],
    totalAmount: { type: Number, required: true },
    shippingAddress: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
