const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

// fetch and render pagination
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

       // Render the brands page with necessary data for pagination 
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reverseBrand = brandData.reverse();
    res.render("brands", {
      data: reverseBrand,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    res.redirect("pageerror");
    console.log("brand page get error", error);
  }
};

//Adding Brand
const addBrand = async (req, res) => {
  try {
    const brandName = req.body.name; // Brand name from the form
    const findBrand = await Brand.findOne({ brandName }); // Check if the brand already exists

    if (!findBrand) {
      // Ensure file upload is valid
      if (!req.file) {
        throw new Error("Image upload is required.");
      }

      const image = req.file.filename; // Get the uploaded image filename
      const newBrand = new Brand({
        brandName: brandName,
        brandImage: image,
      });

      await newBrand.save(); // Save the new brand to the database
      res.redirect("admin/brand"); // Redirect to the brand management page
    } else {
      res.status(400).send("Brand already exists."); // Handle duplicate brand case
    }
  } catch (error) {
    console.error("Add brand error:", error.message);
    res.redirect("pageerror"); // Redirect to the error page
  }
};

module.exports = {
  getBrandPage,
  addBrand,
};
