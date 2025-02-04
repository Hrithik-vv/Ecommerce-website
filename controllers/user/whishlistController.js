const User = require("../../models/userSchema")
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");


const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;

        // Find the user's wishlist and populate product details
        const wishlist = await Wishlist.findOne({ userId }).populate("Products.productId");

        res.render("wishlist", {
            user: req.session.user,  // Send user session info
            wishlist: wishlist ? wishlist.Products.map(item => item.productId) : []  // Extract products
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







module.exports ={
    loadWishlist,
    addToWishlist
}