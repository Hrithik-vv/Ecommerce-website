const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");  // Add Category model import
const fs =require('fs')
const path=require('path');
const { buffer } = require("stream/consumers");
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
const addproduct = async (req, res) => {
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
  const images=[image1,image2,image3,image4]
  // make a folder with product name
 await fs.mkdir(path.join('C:\\Users\\Admin\\Desktop\\7th week\\project\\public','images',productName ), { recursive: true }, (err) => {
    if (err) {
        return console.error('Error creating directory:', err);
    }
    console.log('Directory created successfully!');
})
imagesp=[]
images.forEach((image,index)=>{
  const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, '');
  const binary=Buffer.from(base64WithoutPrefix,'base64')
  fs.writeFile(path.join('C:\\Users\\Admin\\Desktop\\7th week\\project\\public','images',productName,`image${index}.png` ),binary,(err)=>{
    if(err){
      console.log(err);
      
    }
    else{
      
      console.log('sucesss');
      
    }
  })
  imagesp.push(`images/${productName}/image${index}.png`)
})
console.log(imagesp);

  const newproduct = new Product({
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName,
    image1:imagesp[0],
    image2: imagesp[1],
    image3: imagesp[2],
    image4: imagesp[3]
  });
console.log(newproduct);

  newproduct.save();

  res.redirect("/admin/product");
};

module.exports = {
  addproduct,
  loadaddproduct,
};
