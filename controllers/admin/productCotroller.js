const Product = require("../../models/productSchema");

// Load and display all products
const loadproduct = async (req, res) => {
  const products = await Product.find({});

  res.render("product", { products });
};

module.exports = {
  loadproduct,
};
