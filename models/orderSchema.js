const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require("uuid");

const orderSchema = new Schema({
    orderId :{
        type : String,
        default: ()=>uuidv4(),
        unique : true
    },
    orderItems :[{
        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            require:true
        },
        quantity:{
            type:Number,
            required : true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice :{
        type:Number,
        required:true
    },
    discount :{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref :'User',
        required:true
    },
    invoceDate : {
        type:Date
    },
    satatus:{
        type:String,
        required :true,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return Request','Returned']

    },
    createOn :{
        type:Date,
        default:Date.now,
        required:true
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
})

const Order = mongoose.model("order",orderSchema);
module.exports = Order;
