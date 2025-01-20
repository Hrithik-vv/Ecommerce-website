const Product = require("../../models/productSchema");

// Load and display all products
const loadproduct = async (req, res) => {
  const products = await Product.find({});

  res.render("product", { products });
};

const blockProduct = async (req,res)=>{
  try {
  
    
    let id = req.query.id;
    console.log('Blocking product with ID:', id);
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/products")
  } catch (error) {
    res.redirect("/pageerror")
    console.log('block product error', error)
    
  }
}

const unblockProduct =async(req,res)=>{
  try {
   
    let id =req.query.id;
    console.log('Unblocking product with ID:', id);
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/products")
  } catch (error) {
   
    res.redirect("/pageerror")
    console.log('unblock product error', error)
    
  }
}






module.exports = {
  loadproduct,
  blockProduct,
  unblockProduct,
};
