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
  const { name, description } = req.body;

  try {
    const regex = new RegExp(`^${name}$`, "i");
    const existingCategory = await Category.findOne({ name: regex });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res
      .status(201)
      .json({ success: true, message: "Category added successfully" });
  } catch (error) {
    console.error("Add Category Error", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// category offer function

//   const addCategoryOffer = async (req,res)=>{
//     try {

//       const precentage = parseInt(req.body.precentage);
//       const categoryId= req.body.categoryId;
//       const category = await Category.findById(categoryId);
//       if(!category){
//         return res.status(400).json({status:false , message:"Category  not fund"})
//       }
//       const products = await Product.find({category:category._id});
//       const hasProductOffer = products.some((product)=>product.productOffer > precentage);
//       if(hasProductOffer){
//         return res.json({status:false , message:"Product within this category already heve product offers"})
//       }
//       await Category.updateOne({_id:categoryId},{$set: {categoryOffer:precentage}});

//       for(const product of product){
//         product.productOffer = 0;
//         product.salePrice = product.regularPrice;
//         await product.save();
//       }
//       res.json({status:true});

//     }catch(error){
//       res.status(500).json({status:false , message:"Internal Server Error"})
//       console.log('add Catrgory offer error',error);

//     }
//   };

//   // category offer remove function
//  const  removeCategoryOffer = async (req,res)=>{
//   try {

//     const categoryId =req.body.categoryId;
//     const category = await Category.findById(categoryId);

//     if(!category){
//       return res.status(404).json({status:false , message:"Category not found"})
//     }

//     const precentage = category.categoryOffer;
//     const products = await Product.find({category:category._id});

//     if(products.length > 0){
//       for(const product of products){
//         product.salePrice +=Math.floor(product.regularPrice * (precentage/100));
//         product.productOffer = 0;
//         await product.save();
//       }
//     }
//     category.categoryOffer = 0;
//     await category.save();
//     res.json({status:ture});

//   } catch (error) {
//     res.status(500).json({status:false , message:"Internal server Error"})
//     console.log("categoryoffer remove error",error);

//   }
//  }

const getListCategory = async (req, res) => { // Update category status to not listed
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    await product.updateMany(
      { category: id },
      { $set: { isBlocked: true } }
  );
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// Update category status to listed
const getUnlistCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
    console.log("get Unlist Category error", error);
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

    const { categoryname, description } = req.body;
    const existingCategory = await Category.findOne({ name: categoryname });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "Category exists, please choose another name" });
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryname,
        description: description,
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
