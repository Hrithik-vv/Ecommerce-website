const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const adress = require("../../models/addressSchema");

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
const address = require("../../models/addressSchema");
// Add these new functions
const updateQuantity = async (req, res) => {
  try {
    const userId = req.user._id;

    let { productId, quantity } = req.body;

    let a = productId._id;
    productId = a;

    const qty = parseInt(quantity, 10);

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
    const userId = req.session.user_id;
    const {
      useExistingAddress,
      addressId,
      saveAddress,
      fullName,
      street,
      city,
      state,
      postalCode,
      country,
      phone,
      paymentMethod,
    } = req.body;

    // Validate payment method
    if (!paymentMethod) {
      req.flash("error", "Payment method is required");
      return res.redirect("/checkout");
    }

    // Get cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/shopping-cart");
    }

    let selectedAddress;

    // Handle address selection
    if (useExistingAddress && addressId) {
      const existingAddress = await Address.findById(addressId);
      if (!existingAddress) {
        req.flash("error", "Address not found");
        return res.redirect("/checkout");
      }
      selectedAddress = existingAddress;
    } else {
      // Validate new address
      if (!fullName || !street || !city || !postalCode) {
        req.flash("error", "Please fill all required address fields");
        return res.redirect("/checkout");
      }

      // Create new address
      const newAddress = new Address({
        userId,
        fullName,
        street,
        city,
        state,
        postalCode,
        country,
        phone,
      });

      // Save address to user profile if requested
      if (saveAddress) {
        await newAddress.save();
        await User.findByIdAndUpdate(userId, {
          $push: { addresses: newAddress._id },
        });
      }

      selectedAddress = newAddress;
    }

    // Create order
    const order = new Order({
      userId,
      items: cart.items,
      shippingAddress: selectedAddress,
      paymentMethod,
      totalAmount: cart.items.reduce((acc, item) => acc + item.totalPrice, 0),
      status: "Processing",
    });

    await order.save();

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    req.flash("success", "Order placed successfully!");
    res.redirect(`/order-confirmation/${order._id}`);
  } catch (error) {
    console.error("Checkout error:", error);
    req.flash("error", "Error processing your order");
    res.redirect("/checkout");
  }
};

const loadCheckoutPage = async (req, res) => {
  try {
    console.log("Loading checkout page..."); // Debug log

    const userId = req.user._id;

    // Check if user is logged in
    if (!userId) {
      console.log("User not logged in, redirecting to login..."); // Debug log
      req.flash("error", "Please login to checkout");
      return res.redirect("/login");
    }

    // Fetch user data
    const user = await User.findById(userId).populate("addresses", { userId });
    const a = await adress.findOne({ userId: user._id });

    if (!user) {
      console.log("User not found, redirecting to login..."); // Debug log
      req.flash("error", "User not found");
      return res.redirect("/login");
    }

    // Fetch cart data
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      console.log("Cart is empty, redirecting to shopping cart..."); // Debug log
      req.flash("error", "Your cart is empty");
      return res.redirect("/shopping-cart");
    }

    console.log("Rendering checkout page..."); // Debug log
    res.render("checkout", {
      cartItems: cart.items,
      total: cart.items.reduce((acc, item) => acc + item.totalPrice, 0),
      addresses: a,
      user: user,
    });
  } catch (error) {
    console.error("Error loading checkout page:", error); // Debug log
    req.flash("error", "Unable to load checkout");
    res.redirect("/shopping-cart");
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

const placeOrder = async (req, res) => {
  try {
    let { selectedAddressId, products } = req.body;

    const userId = req.user._id;
    products = JSON.parse(products);
    // Get user with addresses
    const user = await User.findById(userId);
    if (!user) {
      req.session.message = { type: "error", text: "User not found" };
      return res.redirect("/checkout");
    }

    // Find selected address
    const address = adress.findById(selectedAddressId);
    if (!address) {
      req.session.message = { type: "error", text: "Address not found" };
      return res.redirect("/checkout");
    }

    const shippingAddress = `
            ${address.name}, 
            ${address.landMark}, 
            ${address.city}, 
            ${address.state}-${address.pincode}, 
            Phone: ${address.phone}
        `
      .replace(/\s+/g, " ")
      .trim();

    // Process products

    const productIds = products.map((p) => p.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    if (dbProducts.length !== products.length) {
      req.session.message = { type: "error", text: "Some products not found" };
      return res.redirect("/checkout");
    }

    // Build order products array
    let totalAmount = 0;
    const orderProducts = products.map((requestProduct) => {
      const dbProduct = dbProducts.find(
        (p) => p._id.toString() === requestProduct.productId
      );

      const price = dbProduct.salePrice;

      const totalPrice = price * requestProduct.quantity;
      totalAmount += totalPrice;

      return {
        productId: dbProduct._id,
        quantity: requestProduct.quantity,
        price: price,
        totalPrice: totalPrice,
      };
    });

    // Create and save order
    const newOrder = new Order({
      userId: userId,
      products: orderProducts,
      totalAmount: totalAmount,
      shippingAddress: selectedAddressId,
      paymentMethod: "COD", // Update based on actual payment method
    });

    await newOrder.save();

    // Clear cart or handle post-order logic here

    req.session.message = {
      type: "success",
      text: `Order placed successfully! Order ID: ${newOrder.orderId}`,
    };
    res.render("order-placed", { productIds });
  } catch (error) {
    console.error("Order placement error:", error);
    req.session.message = {
      type: "error",
      text: "Failed to place order. Please try again.",
    };
    res.redirect("/checkout");
  }
};

const orderView = async (req, res) => {
  try {
    const { productId } = req.query;
    console.log("Product ID:", productId);

    // Find the order containing the productId in its products array
    const order = await Order.findOne({
      "products.productId": new mongoose.Types.ObjectId(productId),
    })
      .populate({
        path: "products.productId",
        select: "productName image1 status salePrice", // Only select necessary fields for the product
      })
      .populate({
        path: "shippingAddress", // Populate the shippingAddress field
        select: "name city state pincode phone altPhone", // Select necessary fields from the address
      })
      .sort({ createdAt: -1 });
    // If no order is found, send a 404 response
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Filter the product details from the order based on the productId
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found in the order.");
    }

    // Log the product details for debugging
    console.log("Product details:", product);

    // Render the product details in the template

    const a = await await adress.findOne(
      {
        userId: order.userId,
        "address._id": new mongoose.Types.ObjectId(order.shippingAddress),
      },
      { "address.$": 1 }
    );

    res.render("orderview", { product, order, address: a.address[0] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const orderPlaced = (req, res) => {
  const userId = req.user ? req.user._id : null;
  res.render("orderPlaced", { userid: userId });
};

const orderHistory = async (req, res) => {
  try {
    let { productId } = req.query; // Extract productId from query params

    if (!productId) {
      req.session.message = { type: "error", text: "Product ID is required" };
      return res.redirect("/orderhistory");
    }

    // Ensure productId is always an array (handles both single and multiple values)
    if (typeof productId === "string") {
      productId = productId.split(","); // Convert comma-separated values to an array
    }

    // Convert productId values to ObjectId
    const objectIds = productId
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id.trim()); // Convert each ID to ObjectId
        } catch (err) {
          console.error("Invalid ObjectId:", id);
          return null; // Return null for invalid ObjectId
        }
      })
      .filter((id) => id !== null); // Remove invalid IDs

    if (objectIds.length === 0) {
      req.session.message = { type: "error", text: "Invalid Product ID(s)" };
      return res.redirect("/orderhistory");
    }

    // Find orders that contain any of the given productIds
    const orders = await Order.find({
      "products.productId": { $in: objectIds },
    }).populate("products.productId");

    if (!orders.length) {
      req.session.message = {
        type: "error",
        text: "No orders found for the given products",
      };
      return res.redirect("/orderhistory");
    }

    res.render("orderhistory", { orders });
  } catch (error) {
    console.error("Error fetching order history:", error);
    req.session.message = {
      type: "error",
      text: "Failed to retrieve order history",
    };
    res.redirect("/orderhistory");
  }
};

module.exports = {
  placeOrder,
  updateQuantity,
  addToCart,
  viewCart,
  removeFromCart,
  loadCheckoutPage,
  processCheckout,
  getCheckoutPage,
  orderView,
  orderPlaced,
  orderHistory,
};
