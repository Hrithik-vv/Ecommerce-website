const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");

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
    }).limit(4); // Limit the number of related products

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
    console.log("Sort Option:", req.query.sort);
    let sortOption = req.query.sort || "popularity";
    let sortQuery = {};

    switch (sortOption) {
      case "popularity":
        sortQuery = { popularity: -1 };
        break;
      case "priceLowHigh":
        sortQuery = { salePrice: 1 };
        break;
      case "priceHighLow":
        sortQuery = { salePrice: -1 };
        break;
      case "rating":
        sortQuery = { rating: -1 };
        break;
      case "newArrivals":
        sortQuery = { createdAt: -1 };
        break;
      case "aToZ":
        sortQuery = { productName: 1 };
        break;
      case "zToA":
        sortQuery = { productName: -1 };
        break;
      default:
        sortQuery = { popularity: -1 };
    }
    console.log("🔹 Sorting by:", sortQuery);

    const products = await Product.find().sort(sortQuery);
    console.log("🔹 Total products fetched:", products.length);

    res.render("shop", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  productDetails,
  getProducts,
};
