const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
  try {
    let id = req.query.id;
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne:id },
      isBlocked: false,
    }).limit(4); // Limit the number of related products

    res.render("product-details", {
      product,
      relatedProducts
    });
    
  } catch (er) {
    console.log(er);
  }
};

module.exports = {
  productDetails,
};
