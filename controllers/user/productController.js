const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res) => {
  try{
    const productId=req.query.id
    const product = await Product.findById(productId).populate("category");
    res.render('product-details.ejs',{product})
    
  }catch(er){
console.log(er);

  }
};

module.exports = {
  productDetails,
};
