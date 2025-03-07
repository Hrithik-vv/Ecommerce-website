const mongoose = require("mongoose")
const {Schema} = mongoose;  


const brandSchema = new Schema({

    brandName : {
        type : String, 
        required : true
    },
    brandImage : {
        type : [String],
        required : true
    },
    isBlocked : {
        TYPE : Boolean,
        default : Date
    }
})

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand; 