const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");  // Add Category model import

// Controller function to load the add product page with category data
const loadaddproduct = async (req, res) => {
  try {
    const categories = await Category.find({});  // Fetch all categories from the database
    res.render("addproduct", { categoryInfo: categories });  // Pass categories to the view
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");  // Redirect to an error page if there's an issue
  }
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
