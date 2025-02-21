const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

// Fetch and render brand page with pagination
const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Fetch brand data with pagination, sorted by the creation date
    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages for pagination
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reverseBrand = brandData.reverse();

    // Render brands page with pagination data
    res.render("brands", {
      data: reverseBrand,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    console.log("Brand page fetch error:", error);
    res.redirect("pageerror");
  }
};

// Add a new brand
const addBrand = async (req, res) => {
  try {
    const brandName = req.body.name; // Get brand name from the request
    const findBrand = await Brand.findOne({ brandName }); // Check if the brand already exists

    if (!findBrand) {
      // Ensure file upload is valid
      if (!req.file) {
        throw new Error("Image upload is required.");
      }


      // Create a new brand entry
      const newBrand = new Brand({
        brandName: brandName,
        brandImage: image,
      });

      await newBrand.save(); 
      res.redirect("admin/brand"); 
    } else {
      res.status(400).send("Brand already exists."); 
    }
  } catch (error) {
    console.error("Add brand error:", error.message);
    res.redirect("pageerror"); 
  }
};

module.exports = {
  getBrandPage,
  addBrand,
};
