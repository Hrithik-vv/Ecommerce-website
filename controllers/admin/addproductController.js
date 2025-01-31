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
  const productId = req.params.id;
  const product = await Product.findById(productId);
  const { _id } = product;

  imagesp = {};
  const images = [req.body.image1, req.body.image2, req.body.image3, req.body.image4];
  
  images.forEach((x, y) => {
    if (x[0] === "i") {
      images[y] = null;
    }
  });
  
  images.forEach((image, index) => {
    if (image) {
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
  
  delete req.body.images;
  delete req.body.image1;
  delete req.body.image2;
  delete req.body.image3;
  delete req.body.image4;

  const mongodata = { ...imagesp, ...req.body };
  
  await Product.findByIdAndUpdate(productId, { $set: mongodata }, { new: true, runValidators: true });

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
  });
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
