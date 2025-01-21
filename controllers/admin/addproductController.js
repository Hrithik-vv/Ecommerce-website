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
    res.render("sample/addproduct", { categoryInfo: categories , product , cat:categories});  // Pass categories to the view
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
  try {
      const productId = req.params.id; // Assuming you're passing product ID in URL
      const product = await Product.findById(productId);
      
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Handle image deletions
      for (let i = 1; i <= 4; i++) {
          const deleteFlag = req.body[`deleteImage${i}`];
          const newImage = req.body[`image${i}`];
          const currentImageField = `image${i}`;
          
          if (deleteFlag === 'true' || newImage) {
              // Delete existing image if it exists
              if (product[currentImageField]) {
                  await deleteImageFromFolder(product[currentImageField]);
              }
              
              // Update database field
              if (deleteFlag === 'true') {
                  product[currentImageField] = ''; // Clear the field if deleted
              }
          }
          
          // Update with new image if provided
          if (newImage) {
              // Handle base64 image data
              if (newImage.startsWith('data:image')) {
                  const base64Data = newImage.split(';base64,').pop();
                  const imageType = newImage.split(';')[0].split('/')[1];
                  const imageName = `product_${productId}_${i}_${Date.now()}.${imageType}`;
                  const imagePath = path.join('uploads', 'products', imageName);
                  const fullPath = path.join(__dirname, '../public', imagePath);

                  // Ensure directory exists
                  await fs.mkdir(path.dirname(fullPath), { recursive: true });
                  
                  // Save new image
                  await fs.writeFile(fullPath, base64Data, { encoding: 'base64' });
                  
                  // Update database field
                  product[currentImageField] = imagePath;
              }
          }
      }

      // Update other product fields
      product.productName = req.body.productName;
      product.description = req.body.description;
      product.salePrice = req.body.salePrice;
      product.quantity = req.body.quantity;
      product.category = req.body.category;
      product.color = req.body.color;

      // Save the updated product
      await product.save();

      res.json({
          success: true,
          message: 'Product updated successfully',
          product
      });

  } catch (error) {
      console.error('Error in editProduct:', error);
      res.status(500).json({
          success: false,
          message: 'Error updating product',
          error: error.message
      });
  }
};

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
