const mongoose = reguire("mongoose")
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
        default : Date.now
    }
})

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand; 