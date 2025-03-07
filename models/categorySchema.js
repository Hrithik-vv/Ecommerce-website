const mongoose = require("mongoose")
const {Schema} = mongoose;

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isBlocked: { 
        type: Boolean, 
        default: false 
    },
    description :{
        type : String,
        required : true
    },
    isListed: {
        type: Boolean,
        default:true
    },
    categoryOffer: {
        type: Number,
        default: 0
    },
    createAt: {
        type: Date,
        default: Date.now
    }
})

const category = mongoose.model("Category", categorySchema);

module.exports = category;