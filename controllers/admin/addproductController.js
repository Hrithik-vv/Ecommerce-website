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
  const {
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName,
    productOffer,
    image1,
    image2,
    image3,
    image4,
    variants
  } = req.body;
  console.log('duifhdfkjdsdasdsaddsdsdssdsd');
  console.log(req.body);
  
  console.log('duifhdfkjdsdasdsaddsdsdssdsd');
  const newproduct = new Product({
    category,
    color,
    quantity,
    salePrice,
    regularPrice,
    description,
    brand,
    productName,
    productOffer,
    variants
  });

  console.log(newproduct);
  const { _id } = await newproduct.save();

  const images = [image1, image2, image3, image4];
  
  // Create a folder with product ID
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

  imagesp = [];
  images.forEach((image, index) => {
    const base64WithoutPrefix = image.replace(/^data:image\/\w+;base64,/, "");
    const binary = Buffer.from(base64WithoutPrefix, "base64");
    
    // Save image file in created folder
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

  mongodata = {
    image1: imagesp[0],
    image2: imagesp[1],
    image3: imagesp[2],
    image4: imagesp[3],
  };

  await Product.findByIdAndUpdate(_id, { $set: mongodata }, { new: true, runValidators: true });
  res.redirect("/admin/product");
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
const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { image1, image2, image3, image4, ...productData } = req.body;
    const images = [image1, image2, image3, image4];
    const imageUpdates = {};

    // Create product directory if it doesn't exist
    const productDir = path.join("public", "images", productId);
    await fs.promises.mkdir(productDir, { recursive: true });

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imageKey = `image${i + 1}`;

      // Skip if image is unchanged (starts with "images/")
      if (!image || image.startsWith('images/')) {
        continue;
      }

      // Process new image
      if (image.startsWith('data:image')) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imagePath = path.join(productDir, `image${i}.png`);
        
        // Save new image
        await fs.promises.writeFile(imagePath, imageBuffer);
        
        // Update image path in database
        imageUpdates[imageKey] = `images/${productId}/image${i}.png`;
      }
    }

    // Update product in database
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { 
        ...productData,
        ...imageUpdates
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      images: imageUpdates
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message
    });
  }
};

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