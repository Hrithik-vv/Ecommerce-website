const Category = require("../../models/categorySchema");
const product = require("../../models/productSchema");
const a = require("mongoose");

// Fetch  paginated
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

// Add a new category
const addCategory = async (req, res) => {
  const { name, description, offer } = req.body;

  try {
    const regex = new RegExp(`^${name}$`, "i");
    const existingCategory = await Category.findOne({ name: regex });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }
    const newCategory = new Category({
      name,
      description,
      categoryOffer: offer,
    });
    await newCategory.save();
    return res
      .status(201)
      .json({ success: true, message: "Category added successfully" });
  } catch (error) {
    console.error("Add Category Error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getListCategory = async (req, res) => {
  // Update category status to not listed
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    await product.updateMany({ category: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getUnlistCategory = async (req, res) => {
  try {
    const { id, action } = req.query;

    let updateData = {};

    // Check the action and update accordingly
    if (action === "list") {
      updateData.isListed = true;
    } else if (action === "unlist") {
      updateData.isListed = false;
    } else {
      return res.redirect("/pageerror");
    }

    // Update the category in the database
    await Category.updateOne({ _id: id }, { $set: updateData });

    // Update the products in that category
    await product.updateMany(
      { category: id },
      { $set: { isBlocked: !updateData.isListed } }
    );

    // Redirect to the category page after the update
    res.redirect("/admin/category");
  } catch (error) {
    console.log("Error updating category and products", error);
    res.redirect("/pageerror");
  }
};

// Fetch category data for editing
const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    res.render("edit-category", { category: category });
  } catch (error) {
    console.log("get edit category error", error);

    res.redirect("/pageerror");
  }
};

// Edit an existing category
const editCategory = async (req, res) => {
  try {
    const id = new a.Types.ObjectId(req.params.id);

    const { categoryname, description, offer } = req.body;
    const existingCategory = await Category.findOne({ name: categoryname });

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryname,
        description: description,
        categoryOffer: offer,
      },
      { new: true }
    );

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("edit category error", error);
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  // addCategoryOffer,
  // removeCategoryOffer,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};
