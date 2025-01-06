const mongoose = require("mongoose")
const {Schema} = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type : String,
        required : true,
        unique : true

    },
    description :{
        type : String,
        required : true
    },
    isListed: {
        type: Boolean,
        default:true
    },
     categoryOffer:{
        type : Number,
        defult:0
     },
     createAt: {
        type: Date,
        defult : Date.now
     }
})

const categoty = mongoose.model("Category",categorySchema);

module.exports =categoty;