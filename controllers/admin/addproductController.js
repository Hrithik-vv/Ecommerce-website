const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");  // Add Category model import
const fs =require('fs')
const path=require('path');
const { buffer } = require("stream/consumers");
// Controller function to load the add product page with category data
const loadaddproduct = async (req, res) => {
  try {
    const categories = await Category.find({}); 
    const product = await Product.find({}) // Fetch all categories from the database
    res.render("addproduct", { categoryInfo: categories , product , cat:categories});  // Pass categories to the view
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
  


  const newproduct = new Product({
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName
  });
console.log(newproduct);

  const {_id}=await newproduct.save();

const images=[image1,image2,image3,image4]
  // make a folder with product name
 await fs.mkdir(path.join('C:\\Users\\Admin\\Desktop\\7th week\\project\\public','images',`${_id}`), { recursive: true }, (err) => {
    if (err) {
        return console.error('Error creating directory:', err);
    }
    console.log('Directory created successfully!');
})
imagesp=[]
images.forEach((image,index)=>{
  const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, '');
  const binary=Buffer.from(base64WithoutPrefix,'base64')
  fs.writeFile(path.join('C:\\Users\\Admin\\Desktop\\7th week\\project\\public','images',`${_id}`,`image${index}.png` ),binary,(err)=>{
    if(err){
      console.log(err);
      
    }
    else{
      
      console.log('sucesss');
      
    }
  })
  imagesp.push(`images/${_id}/image${index}.png`)
})
mongodata={
image1:imagesp[0],
    image2: imagesp[1],
    image3: imagesp[2],
    image4: imagesp[3]}

await Product.findByIdAndUpdate(
  _id,
  { $set: mongodata }, // Use $set to update specified fields
  { new: true, runValidators: true } // Return the updated document and apply validation
)


  res.redirect("/admin/product");
};


async function deleteImageFromFolder(imagePath) {
  try {
      if (!imagePath) return;
      
      // Get full path
      const fullPath = path.join(__dirname, '../public', imagePath);
      
      // Check if file exists before deleting
      try {
          await fs.access(fullPath);
          await fs.unlink(fullPath);
          console.log('Successfully deleted image from folder:', fullPath);
      } catch (err) {
          if (err.code === 'ENOENT') {
              console.log('File does not exist:', fullPath);
          } else {
              throw err;
          }
      }
  } catch (error) {
      console.error('Error deleting image from folder:', error);
      throw error;
  }
}

const editProduct = async (req, res) => {
  const productId = req.params.id;

  // Step 2: Find the product document in the database
  const product = await Product.findById(productId);
  const {_id}=product
  
  imagesp={}
    const images=[req.body.image1,req.body.image2,req.body.image3,req.body.image4]
    fimages=[]
    images.forEach((x,y)=>{
      if(x[0]==='i'){
        images[y]=null
      
      }
    })
    
    images.forEach((image,index)=>{
  if(image){
    const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, '');
  const binary=Buffer.from(base64WithoutPrefix,'base64')
  fs.writeFile(path.join('C:\\Users\\Admin\\Desktop\\7th week\\project\\public','images',`${_id}`,`image${index}.png` ),binary,(err)=>{
    if(err){
      console.log(err);
      
    }
    else{
      
      console.log('sucesss');
      
    }
  })
  imagesp[`image${index}`] = `images/${_id}/image${index}.png`
  }
})
delete req.body.images
delete req.body.image1
delete req.body.image2
delete req.body.image3
delete req.body.image4

const mongodata = { ...imagesp, ...req.body };
await Product.findByIdAndUpdate(
  productId,
  { $set: mongodata }, // Use $set to update specified fields
  { new: true, runValidators: true } // Return the updated document and apply validation
)
res.status(200).json({
  success: true,
  message: "Product updated successfully"
});

}



const deleteProductImage = async (req, res) => {
  try {
      const { productId, imageNumber } = req.params;
      
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const imageField = `image${imageNumber}`;
      const imagePath = product[imageField];

      if (!imagePath) {
          return res.status(400).json({ success: false, message: 'No image to delete' });
      }

      // Delete image from folder
      await deleteImageFromFolder(imagePath);

      // Update database
      product[imageField] = '';
      await product.save();

      res.json({
          success: true,
          message: 'Image deleted successfully'
      });

  } catch (error) {
      console.error('Error in deleteProductImage:', error);
      res.status(500).json({
          success: false,
          message: 'Error deleting image',
          error: error.message
      });
  }
};

module.exports = {
  addproduct,
  loadaddproduct,
  deleteProductImage,
  editProduct
};
