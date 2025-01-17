const Product = require("../../models/productSchema");

const loadaddproduct = (req, res) => {
  res.render("addproduct");
};

// Controller function to handle the addition of a new product
const addproduct = (req, res) => {
  const {
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName,
    image1,
    image2,
    image3,
    image4,

  } = req.body;
  console.log(image4);
  
  const newproduct = new Product({
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName,
    image1,
    image2,
    image3,
    image4,
  });

  newproduct.save();

  res.redirect("/admin/product");
};
module.exports = {
  addproduct,
  loadaddproduct,
};
