const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const Category = product.category.name;

    res.render("product-details", {
      user: userData,
      product: product,
      quantiry: product.quantity,
      totalOffer: 0,
      Category: 0,
    });
  } catch (error) {
    console.error("Error for frtching product detals", error);
    res.redirect("/pageeNotFound");
  }
};

module.exports = {
  productDetails,
};
