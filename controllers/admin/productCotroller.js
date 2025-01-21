const Product = require("../../models/productSchema");
const category = require("../../models/categorySchema")
// Load and display all products
const loadproduct = async (req, res) => {
  const products = await Product.find({});

  res.render("product", { products });
};

const blockProduct = async (req,res)=>{
  try {
  
    
    let id = req.query.id;
    console.log('Blocking product with ID:', id);
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect("/admin/product")
  } catch (error) {
    res.redirect("/pageerror")
    console.log('block product error', error)
    
  }
}

const unblockProduct =async(req,res)=>{
  try {
   
    let id =req.query.id;
    console.log('Unblocking product with ID:', id);
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/product")
  } catch (error) {
   
    res.redirect("/pageerror")
    console.log('unblock product error', error)
    
  }
}


const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });
    console.log(product)
    const categories = await category.find({});
    // const brands = await Brand.find({});
    
    res.render("edit-product", {
      product: product,
      categoryInfo: categories,
      // brand: brands,
    });
  } catch (error) {
    res.redirect("/pageerror");
    console.log("Edit product error:", error);
  }
};


const editProduct = async (req,res)=>{
  try {
    const id = req.params.id;
    const product = await Product.findOne({_id:id});
    const data =req.body;
    const existingProduct  = await Product.findOne({
      productName:data.productName,
      _id:{$ne:id}
    })

    if(existingProduct){
      return res.status(400).json({error:"Product with this name already exists.replace try with another name"});

    }

    const image = [];

    if(req.files && req.files.length>0){
      for(let i=0; i<req.files.lengthl; i++){
        images.push(req.files[i].filename)
      }
    }

    const updateFields = {
      productName:data.productName,
      description:data.description,
      // brand:data.brand,
      category:product.category,
      regularPrice:data.regularPrice,
      salePrice:data.salePrice,
      quantity:data.quantity,
      size:data.size,
      color:data.color
    }
    if (image.length > 0) { // Check if there are images to update
      updateFields.$push = { productImage: { $each: image } };
    }

    await Product.findByIdAndUpdate(id,updateFields,{new:true});
    res.redirect("/admin/product")

  } catch (error) {
    console.error(error);
    res.redirect("/pageerror")
    
  }
}

const deleteSingleImage = async (req,res)=>{
  try {
    
    const {imageNameTOServer,productIdServer} = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameTOServer}})
    const imagePath = Path2D.join("public","uploads","re-image",imageNameTOServer);
    if(fs.existsSync(imagePath)){
      await fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameTOServer} delete successfully`);     
    }else{
      console.log(`Image ${imageNameTOServer} not found`);
    }
    res.send({statuus:true});


  } catch (error) {
    res.redirect("/pageerror")
  }
}




module.exports = {
  loadproduct,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
