const mongoose = require("mongoose");
const { Schema } = mongoose;

const otpSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true, 
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 15,
  },
  
});

const OTP = mongoose.model("OTP", otpSchema);
module.exports = OTP;
