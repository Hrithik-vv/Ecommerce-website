const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const productDetails = async (req, res) => {
  try {
    let id = req.query.id;
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    console.log(product);

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isBlocked: false,
    }).limit(4);
    res.render("product-details", {
      product,
      relatedProducts,
    });
  } catch (er) {
    console.log(er);
  }
};

//filtter
const getProducts = async (req, res) => {
  try {
    const { sort, minPrice, maxPrice, category, search } = req.query;
    let query = { isBlocked: false };
    let sortQuery = {};

    // Handle search filtering
    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }

    // Handle price filtering
    if (minPrice !== undefined && maxPrice !== undefined) {
      query["variants.0.price"] = {
        $gte: parseFloat(minPrice),
        $lte: parseFloat(maxPrice),
      };
    }

    // Handle category filtering
    if (category && category !== "all") {
      try {
        query.category = new mongoose.Types.ObjectId(category);
      } catch (err) {
        console.log("Invalid category ID:", err);
      }
    }

    // Handle sorting
    switch (sort) {
      case "priceLowHigh":
        sortQuery = { "variants.0.price": 1 };
        break;
      case "priceHighLow":
        sortQuery = { "variants.0.price": -1 };
        break;
      case "aToZ":
        sortQuery = { productName: 1 };
        break;
      case "zToA":
        sortQuery = { productName: -1 };
        break;
      case "newArrivals":
        sortQuery = { createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    console.log("Applied Query:", query);
    console.log("Applied Sort:", sortQuery);

    // Fetch products with filters and sorting
    const products = await Product.find(query)
      .populate("category")
      .sort(sortQuery)
      .lean(); // Using lean() for better performance

    // Get categories for sidebar
    const categories = await Category.find({ isBlocked: false }).lean();

    // Create filters object with current values
    const filters = {
      minPrice: minPrice || "",
      maxPrice: maxPrice || "",
      selectedCategory: category || "all",
      selectedSort: sort || "newArrivals",
      search: search || "",
    };

    console.log("Applied Filters:", filters);
    console.log("Found Products:", products.length);

    res.render("shop", {
      products,
      category: categories,
      filters,
      user: req.session.user || null,
    });
  } catch (error) {
    console.error("Error in getProducts:", error);
    res.render("shop", {
      products: [],
      category: [],
      filters: {
        minPrice: "",
        maxPrice: "",
        selectedCategory: "all",
        selectedSort: "newArrivals",
        search: "",
      },
      user: req.session.user || null,
    });
  }
};

module.exports = {
  productDetails,
  getProducts,
};
