const mongoose = require ("mongoose");
const { addAddress } = require("../controllers/user/profileController");
const {Schema} = mongoose;


const addressSchema = new Schema ({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref : "User",
        required: true
    },
    address : [{
        addressType:{
            type: String,
            required : true
        },
        name:{
            type :String,
            required :true,
        },
        city:{
            type: String,
            required : true,
        },
        landMark:{
            type:String,
            required : false
        },
        state:{
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        phone: {
            type : String,
            required: true
        },
        altPhone: {
            type: String,
            required: true 
        }
    }]
})

const address = mongoose.model("Address",addressSchema);

module.exports = address; 