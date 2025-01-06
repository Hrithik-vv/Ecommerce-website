const mongoose = require("mongoose");
const { schema } = require("./userSchema");
const {Schema} = mongoose;

const productSchema = new Schema({
    productName : {
        type : String,
        required : true
    },
    description :{
        type : String,
        required : true
    },
    brand: {
        type : String,
        required : true
    },
    category : {
        type:Schema.Types.ObjectId,
        ref : "Category",
        required: true
    },
    salePrice : {
        type : Number,
        required : true
    },
    prooductOffer :{
        type : Number,
        default : 0
    },
    quantity : {
        type : Number,
        default : true
    },
    color :{
        type: String,
        required :true
    },
    productImage:{
        type : [String],
        required :true
    },
    isBlocked:{
        type : Boolean,
        default: false
    },
    status :{
        type : String,
        enum : ["Avilable","out of stock","Discountinued"],
        required :true,
        default:"Avilable"
    },
},{timestamps:true});

const Product =  mongoose.Model("Product",productSchema);

module.exports = Product;