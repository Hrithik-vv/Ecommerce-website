const mongoose = require("mongoose");
const Product = require("./productSchema");
const {Schema} = mongoose;

const wishlistSchema = new Schema({
    userId :{
        type: Schema.Types.ObjectId,
        ref : "User",
        required : true,
    },
    Products :[{
        productId :{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required : true
        },
        addedOn : {
            type: Date,
            default : Date.now
        }
    }]
})
const Whishlist = mongoose.model("Whishlist",wishlistSchema);
module.exports = Whishlist;