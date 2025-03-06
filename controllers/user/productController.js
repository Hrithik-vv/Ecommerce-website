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
  console.log(req.query);
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    // Base query
    let query = { isBlocked: false };

    // Add category filter if category exists
    if (req.query.category && req.query.category !== 'all') {
      // Convert string category ID to MongoDB ObjectId
      query.category = new mongoose.Types.ObjectId(req.query.category);
    }

    // Add search condition if search query exists
    if (req.query.search) {
      query.productName = { $regex: req.query.search, $options: 'i' };
    }

    // Add price range conditions if they exist and are not 'all'
    if (
      req.query.minPrice !== undefined && 
      req.query.maxPrice !== undefined && 
      req.query.minPrice !== 'all'
    ) {
      // Only add price filter if not "all"
      const minPrice = parseInt(req.query.minPrice);
      const maxPrice = parseInt(req.query.maxPrice);
      
      // Verify the numbers are valid before adding to query
      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        query['variants.price'] = {
          $gte: minPrice,
          $lte: maxPrice
        };
      }
    }

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    // Build sort object
    let sortOption = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newArrivals':
          sortOption = { createdAt: -1 };
          break;
        case 'priceLowHigh':
        case 'priceLowToHigh':
          sortOption = { 'variants.price': 1 };
          break;
        case 'priceHighLow':
        case 'priceHighToLow':  
          sortOption = { 'variants.price': -1 };
          break;
        case 'popularity':
          sortOption = { popularity: -1 };
          break;
        case 'aToZ':
          sortOption = { productName: 1 };
          break;
        case 'zToA':
          sortOption = { productName: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    // Fetch products with pagination, sorting and populate category
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate('category');

    // Send response
    res.json({
      products,
      currentPage: page,
      totalPages,
      totalProducts
    });

  } catch (error) {
    console.error('Error in getProducts:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
  
}

module.exports = {
  productDetails,
  getProducts,
};
