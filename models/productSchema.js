const mongoose = require("mongoose");
const { Schema } = mongoose;

// Define the variant sub-schema
const variantSchema = new Schema({
  color: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true,
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  }
});

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    variants: [variantSchema],
    image1: {
      type: String,
      required: true
    },
    image2: {
      type: String
    },
    image3: {
      type: String
    },
    image4: {
      type: String
    },
    isBlocked: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["Available", "out of stock", "Discontinued"],
      default: "Available"
    },
    popularity: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
