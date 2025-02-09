const User = require("../../models/userSchema")
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        // Find the user's wishlist and populate product details
        const a = await Wishlist.findOne({ userId })
        .populate("Products.productId") 
        const productsinwish = a.Products .map(item => item.productId);

        res.render("wishlist", {
            user: req.session.user, 
            wishlist:productsinwish  
        });

    } catch (error) {
        console.error(error);
        res.redirect("/pageNotFound");
    }
};

const addToWishlist = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;

        // Find the user's wishlist
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            // Create a new wishlist if not found
            wishlist = new Wishlist({
                userId,
                Products: [{ productId }]
            });
            await wishlist.save();
            return res.status(200).json({ status: true, message: 'Product added to wishlist', action: 'add' });
        }

        // Check if the product is already in the wishlist
        const productIndex = wishlist.Products.findIndex(item => item.productId.toString() === productId);

        if (productIndex > -1) {
            // Remove the product from wishlist
            await Wishlist.updateOne(
                { userId },
                { $pull: { Products: { productId } } }
            );
            return res.status(200).json({ status: true, message: 'Product removed from wishlist', action: 'remove' });
        } else {
            // Add the product to the wishlist
            await Wishlist.updateOne(
                { userId },
                { $push: { Products: { productId } } }
            );
            return res.status(200).json({ status: true, message: 'Product added to wishlist', action: 'add' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Server error' });
    }
};


const removeProduct = async (req,res)=>{
    try {
        const productId = req.query.productId;
        const user = req.session.user;
        console.log('kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk');
        
        console.log(user._id);
        
    
        
        console.log('kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk');
       


const mongoose = require('mongoose');

const result = await Wishlist.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(user._id) }, // Convert userId to ObjectId
    { 
      $pull: { 
        Products: { productId: new mongoose.Types.ObjectId(productId) } // Convert productId to ObjectId
      } 
    },
    { new: true }
  );
        if (result) {
          console.log(result);
          
            return res.redirect("/wishlist");
        } else {
            console.log("User not found or wishlist update failed.");
            return res.status(404).send("User not found or update failed.");
        }
        
        

    } catch (error) {
        
        console.error(error);
        return res.status(500).json({status:false,message:'Server error'})
    }
}





module.exports ={
    loadWishlist,
    addToWishlist,
    removeProduct
}