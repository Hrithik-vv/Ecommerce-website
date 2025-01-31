const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");

const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    // Convert to numbers safely
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    // Get product with price validation
    const product = await Product.findById(productId).select("salePrice");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Convert price to number safely
    const productPrice = Number(product.salePrice);
    if (isNaN(productPrice)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }

    // Find or create cart
    let cart =
      (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });

    // Find existing item
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex > -1) {
      // Update existing item
      cart.items[itemIndex].quantity += qty;
      cart.items[itemIndex].totalPrice =
        cart.items[itemIndex].quantity * productPrice;
    } else {
      // Add new item with correct field names
      cart.items.push({
        productId,
        quantity: qty,
        productPrice: productPrice, // Match schema field name
        totalPrice: productPrice * qty,
      });
    }

    // Validate before saving
    const validationError = cart.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({
        success: false,
        message: "Invalid cart data",
      });
    }

    await cart.save();
    res.redirect("/shopping-cart"); // Redirect to cart page
  } catch (error) {
    console.error("Cart error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
// Export functions correctly
module.exports = { addToCart };

const viewCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "productName price"
    );

    if (!cart) {
      const newCart = new Cart({ userId, items: [] });
      await newCart.save();
      return res.render("shopping-cart", {
        cartItems: [],
        messages: {
          success: req.flash("success"),
          error: req.flash("error"),
        },
      });
    }

    res.render("shopping-cart", {
      cartItems: cart.items,
    });
  } catch (error) {
    console.error(error);
    req.flash("error", "Error loading cart");
    res.redirect("/");
  }
};
// Add this removeFromCart function
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const productId = req.params.productId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Filter out the item to remove
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await cart.save();

    // Redirect back to cart page
    res.redirect("/shopping-cart");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while removing the item from cart",
    });
  }
};
const mongoose = require("mongoose");
// Add these new functions
const updateQuantity = async (req, res) => {
  try {
    const userId = req.user._id;

    let { productId, quantity } = req.body;
    console.log("sajkdnkajsdnak");

    console.log(userId);
    console.log("saoidnakjdn");

    let a = productId._id;
    productId = a;

    const qty = parseInt(quantity, 10);
    console.log("kjdsfkjsbd");

    console.log(qty);
    console.log("kjdsfkjsbd");

    // Update cart
    const cart = await Cart.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        "items.productId": new mongoose.Types.ObjectId(productId),
      }, // Ensure correct ObjectId format
      {
        $set: {
          "items.$.quantity": qty,
        },
      },
      { new: true }
    );

    if (!cart) {
      req.flash("error", "Cart or product not found");
      return res.redirect("/shopping-cart");
    }

    res.redirect("/shopping-cart");
  } catch (error) {
    console.log(error);

    req.flash("error", "Error updating quantity");
    res.redirect("/shopping-cart");
  }
};

//checkOut
const processCheckout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { address, paymentMethod } = req.body;

    // Validate required fields
    if (!address || !paymentMethod) {
      req.flash("error", "Please fill all required fields");
      return res.redirect("/checkout");
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/shopping-cart");
    }

    // Create order
    const newOrder = new Order({
      userId,
      items: cart.items.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.productPrice,
        totalPrice: item.totalPrice,
      })),
      totalAmount: cart.items.reduce((acc, item) => acc + item.totalPrice, 0),
      shippingAddress: address,
      paymentMethod,
      status: "Pending",
    });

    await newOrder.save();

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { new: true }
    );

    req.flash("success", "Order placed successfully!");
    res.redirect("/orders");
  } catch (error) {
    console.error(error);
    req.flash("error", "Checkout failed. Please try again.");
    res.redirect("/checkout");
  }
};

// In cartController.js (loadCheckoutPage function)
const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId).populate("addresses");

    // Get cart data
    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );

    res.render("user/checkout", {
      cart: cartData.products,
      total: cartData.totalPrice,
      userData: user,
      addresses: user.addresses,
      coupons: [],
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
};

// address fetch
const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addresses = await Address.findOne({ userId: userId });

    res.render("checkout", {
      user: userData,
      addresses: addresses ? addresses.address : [],
      selectedAddress: req.session.selectedAddress,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = {
  updateQuantity,
  addToCart,
  viewCart,
  removeFromCart,
  loadCheckoutPage,
  processCheckout,
  getCheckoutPage,
};
