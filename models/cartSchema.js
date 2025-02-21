const mongoose = require ("mongoose");
const {Schema} =mongoose;

const cartSchema = new Schema({
    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    items :[{
        productId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        variantId:{
            type: String,
            required: true
        },
        quantity :{
            type: Number,
            default: 1
        },
        productPrice:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:"Placed"
        },
        cancellationReason:{
            type:String,
            default:"none"
        }
    }]
})

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;
