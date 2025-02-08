const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new Schema({
  size: {
    type: String,
    required: true,
    enum: ['s', 'm', 'l', 'xl', 'xxl']
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
});

const productSchema = new Schema(
  {
    productName: {
      type: String,
    },
    description: {
      type: String,
    },
    brand: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    salePrice: {
      type: Number,
      required: true,
      min: 0
    },
    productOffer: {
      type: Number,
      default: 0,
    },
    variants: [variantSchema],
    color: {
      type: String,
    },
    productImage: {
      type: [String],
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Available", "out of stock", "Discontinued"],
      default: "Available",
    },
    image1: String,
    image2: String,
    image3: String,
    image4: String,
    popularity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Correct usage of mongoose.model()
const Product = mongoose.model("Product", productSchema);

module.exports = Product;