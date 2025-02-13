const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");

// Load the add product page with category data
const loadaddproduct = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    const product = await Product.find({});
    res.render("addproduct", {
      categoryInfo: categories,
      product,
      cat: categories,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

// Add a new product
const addproduct = async (req, res) => {
  try {
    const {
      category,
      description,
      productName,
      variants: variantsJson,
      offer
    } = req.body;

    // Parse variants from JSON string
    const variants = JSON.parse(variantsJson);

    // Create product with dummy image paths first
    const newproduct = new Product({
      category,
      description,
      productName,
      variants,
      offer: offer || 0, // Set default to 0 if no offer provided
      image1: 'dummy',
      image2: 'dummy', 
      image3: 'dummy',
      image4: 'dummy'
    });

    const { _id } = await newproduct.save();

    // Create product images directory
    await fs.mkdir(
      path.join("C:\\Users\\Admin\\Desktop\\7th week\\project\\public", "images", `${_id}`),
      { recursive: true },
      (err) => {
        if (err) {
          return console.error("Error creating directory:", err);
        }
        console.log("Directory created successfully!");
      }
    );

    // Process uploaded images
    const images = [req.body.image1, req.body.image2, req.body.image3, req.body.image4];
    const imagesp = [];

    images.forEach((image, index) => {
      if (!image) return;

      const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, "");
      const binary = Buffer.from(base64WithoutPrefix, "base64");
      
      fs.writeFile(
        path.join("C:\\Users\\Admin\\Desktop\\7th week\\project\\public", "images", `${_id}`, `image${index}.png`),
        binary,
        (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("Image saved successfully");
          }
        }
      );
      imagesp.push(`images/${_id}/image${index}.png`);
    });

    // Update product with real image paths
    const mongodata = {
      image1: imagesp[0] || 'dummy',
      image2: imagesp[1] || 'dummy',
      image3: imagesp[2] || 'dummy', 
      image4: imagesp[3] || 'dummy'
    };

    await Product.findByIdAndUpdate(_id, { $set: mongodata }, { new: true, runValidators: true });
    res.redirect("/admin/product");

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding product" });
  }
};
const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    
    const { _id } = product;
    const imagesp = {};
    
    // Get image data from request body
    const images = [req.body.image1, req.body.image2, req.body.image3, req.body.image4];
    
    // Process only images that exist and start with data:image
    images.forEach((image, index) => {
      if (image && image.startsWith('data:image')) {
        const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, "");
        const binary = Buffer.from(base64WithoutPrefix, "base64");
        
        // Save updated image file
        fs.writeFile(
          path.join("C:\\Users\\Admin\\Desktop\\7th week\\project\\public", "images", `${_id}`, `image${index}.png`),
          binary,
          (err) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Image updated successfully");
            }
          }
        );
        imagesp[`image${index+1}`] = `images/${_id}/image${index}.png`;
      }
    });

    // Remove image fields from request body
    delete req.body.image1;
    delete req.body.image2;
    delete req.body.image3;
    delete req.body.image4;

    // Process variants
    const variants = [];
    const variantKeys = Object.keys(req.body).filter(key => key.startsWith('variants['));
    const variantIndices = [...new Set(variantKeys.map(key => key.match(/\[(\d+)\]/)[1]))];

    // Get existing variants from product
    const existingVariants = product.variants || [];

    variantIndices.forEach(index => {
      const variantId = req.body[`variants[${index}][_id]`];
      const variantData = {
        stock: req.body[`variants[${index}][stock]`],
        price: req.body[`variants[${index}][price]`],
        color: req.body[`variants[${index}][color]`],
        size: req.body[`variants[${index}][size]`]
      };

      if (variantId) {
        // If variant has ID, find and update existing variant
        const existingVariant = existingVariants.find(v => v._id.toString() === variantId);
        if (existingVariant) {
          variants.push({
            ...variantData,
            _id: existingVariant._id
          });
        } else {
          // If ID not found, create new variant
          variants.push({
            ...variantData,
            _id: new mongoose.Types.ObjectId()
          });
        }
      } else {
        // If no ID, check if variant with same color and size exists
        const existingVariant = existingVariants.find(v => 
          v.color === variantData.color && v.size === variantData.size
        );
        if (existingVariant) {
          variants.push({
            ...variantData,
            _id: existingVariant._id
          });
        } else {
          variants.push({
            ...variantData,
            _id: new mongoose.Types.ObjectId()
          });
        }
      }
    });

    // Combine updated data
    const mongodata = { 
      ...req.body,
      ...imagesp,
      variants
    };

    // Remove individual variant fields
    variantKeys.forEach(key => delete mongodata[key]);
    
    // Update product
    await Product.findByIdAndUpdate(productId, 
      { $set: mongodata }, 
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Error updating product", 
      error: error.message
    });
  }
};
// Delete an image from the folder and database
async function deleteImageFromFolder(imagePath) {
  try {
    if (!imagePath) return;
    const fullPath = path.join(__dirname, "../public", imagePath);
    
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      console.log("Successfully deleted image from folder:", fullPath);
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log("File does not exist:", fullPath);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error("Error deleting image from folder:", error);
    throw error;
  }
}

// Edit product details


// Delete a product image
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageNumber } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const imageField = `image${imageNumber}`;
    const imagePath = product[imageField];

    if (!imagePath) {
      return res.status(400).json({ success: false, message: "No image to delete" });
    }

    await deleteImageFromFolder(imagePath);
    product[imageField] = "";
    await product.save();

    res.json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProductImage:", error);
    res.status(500).json({ success: false, message: "Error deleting image", error: error.message });
  }
};

module.exports = {
  addproduct,
  loadaddproduct,
  deleteProductImage,
  editProduct,
};
