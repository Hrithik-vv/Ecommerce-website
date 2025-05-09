const mongoose = require("mongoose");
const { Schema } = mongoose;


const userSchema = new Schema({
  name: {
    type: String,
    default: "Unnamed User",
  },
  email: {
    type: String,
    required: true,
    unique: true,
    sparse:true
  },
  googleId:{
    type:String,
    require:true,
    required: false, // Make it optional
  sparse: true, 
  },
  addresses: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
   
  // phone: {
  //   type: String,
  //   required: false,
  //   unique: false,
  //   sparse: true,
  //   default: null,
  // },
  password: {
    type: String,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  cart: [
    {
      type: Schema.Types.ObjectId,
      ref: "Cart",
    },
  ],
  wallet: {
    type: Number,
    default: 0,
  },
  wishlist: [
    {
      type: Schema.Types.ObjectId,
      ref: "Wishlist",
    },
  ],
  orderHistory: {
    type: Schema.Types.ObjectId,
    ref: "Order",
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  referalCode: {
    type: String,
  },
  redeemed: {
    type: Boolean,
  },
  redeemedUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  searchHistory: [
    {
      category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
      brand: {
        type: String,
      },
      searchOn: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const User = mongoose.model("User", userSchema);
module.exports = User;
