const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const adress = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");

const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, variantId, quantity, price } = req.body;
   
    // Validate input
    if (!productId || !variantId || !quantity || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Convert to numbers safely
    const qty = parseInt(quantity, 10);
    const productPrice = parseFloat(price);

    if (isNaN(qty) || qty <= 0 || isNaN(productPrice) || productPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity or price"
      })
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [] });

    // Find existing item with same variant - with null checks
    const itemIndex = cart.items.findIndex(item => {
      return item && item.productId && item.variantId &&
             item.productId.toString() === productId.toString() &&
             item.variantId.toString() === variantId.toString();
    });

    if (itemIndex > -1) {
      // Update existing item
      cart.items[itemIndex].quantity += qty;
      cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * productPrice;
    } else {
      // Add new item
      cart.items.push({
        productId,
        variantId,
        quantity: qty,
        productPrice,
        totalPrice: productPrice * qty
      });
    }

    await cart.save();
    res.redirect('/shopping-cart');

  } catch (error) {
    console.error('Error in addToCart:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Export functions correctly
module.exports = { addToCart };

const viewCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "productName price image1 image2 image3 image4 variants status"
    );

    console.log('Cart fetched:', cart);

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

    // Loop through cart items and query the product quantity directly
    const updatedCartItems = await Promise.all(cart.items.map(async (item) => {
      // Query the Product model to grab the quantity and variant info
      const product = await Product.findById(item.productId);

      if (product) {
        // Find matching variant
        const variant = product.variants.find(v => v._id.toString() === item.variantId?.toString());
        
        // Assign product details
        item.productStock = variant ? variant.stock : 0;
        item.productImages = {
          image1: product.image1,
          image2: product.image2,
          image3: product.image3,
          image4: product.image4
        };
        item.productStatus = product.status;
        item.variant = variant;

        // Add color and size from variant
        if (variant) {
          item.color = variant.color;
          item.size = variant.size;
        }
      }

      return item;
    }));

    // Send updated cart items with product details
    res.render("shopping-cart", {
      cartItems: updatedCartItems,
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
    const userId = req.user._id;  // Get the user ID from the session
    let { productId, quantity } = req.body;
    const product= await Product.findById(productId)
    
     

    // Ensure the quantity is an integer
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      req.flash("error", "Invalid quantity");
      return res.redirect("/shopping-cart");
    }
    // Update cart - use correct ObjectId format
    const cart = await Cart.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        "items.productId": new mongoose.Types.ObjectId(productId),
      },
      {
        $set: {
          "items.$.quantity": qty,
          "items.$.totalPrice": qty * product.salePrice,  // Recalculate the total price
        },
      },
      { new: true }
    );

    if (!cart) {
      req.flash("error", "Cart or product not found");
      return res.redirect("/shopping-cart");
    }

    res.redirect("/shopping-cart");  // Redirect back to cart
  } catch (error) {
    console.error(error);
    req.flash("error", "Error updating quantity");
    res.redirect("/shopping-cart");
  }
};


//checkOut
const processCheckout = async (req, res) => {

  try {
    const userId = req.user._id;  // Changed from req.session.user_id to req.user._id
    const { selectedAddressId, paymentMethod } = req.body;

    // Get cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      req.flash("error", "Your cart is empty");
      return res.redirect("/shopping-cart");
    }

    // Validate address
    if (!selectedAddressId) {
      req.flash("error", "Please select a delivery address");
      return res.redirect("/checkout");
    }

    // Calculate total amount
    const totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Create order
    const order = new Order({
      couponId: req.body.couponCode,
      userId: userId,
      products: cart.items.map(item => ({
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        color: item.color,
        size: item.size
      })),
      totalAmount: totalAmount,
      shippingAddress: selectedAddressId,
      paymentMethod: 'COD',
      status: 'Processing',
      paymentStatus: 'pending'
    });

    await order.save();

    // Clear cart after successful order creation
    await Cart.findOneAndUpdate(
      { userId }, 
      { $set: { items: [] } }
    );

    // Redirect to order success page
    req.flash("success", "Order placed successfully!");
    res.redirect('/order-placed');

  } catch (error) {
    console.error("Checkout error:", error);
    req.flash("error", "Error processing your order");
    res.redirect("/checkout");
  }
};


// address fetch
const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addresses = await Address.findOne({ userId: userId });
    const coupons = await Coupon.find({
      isList: true,
      createdOn: { $lte: new Date() },
      expireOn: { $gte: new Date() },
      usedBy: { $ne: userId } // Exclude coupons already used by this user
    });


    res.render("checkout", {
      user: userData,
      addresses: addresses ? addresses.address : [],
      selectedAddress: req.session.selectedAddress,
      coupons: coupons, // Pass available coupons to the view
      messages: {
        success: req.flash('success'),
        error: req.flash('error')
      }
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

const loadCheckoutPage = async (req, res) => {
  try {
      const userId = req.user._id;
      
      // Fetch cart data
      const cart = await Cart.findOne({ userId })
          .populate('items.productId');

      if (!cart || cart.items.length === 0) {
          req.flash('error', 'Your cart is empty');
          return res.redirect('/shopping-cart');
      }

      // Add size and color to cart items from variants
      const updatedCartItems = await Promise.all(cart.items.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (product) {
              const variant = product.variants.find(v => v._id.toString() === item.variantId?.toString());
              if (variant) {
                  item.size = variant.size;
                  item.color = variant.color;
              }
          }
          return item;
      }));

      cart.items = updatedCartItems;

      // Fetch user data and addresses
      const user = await User.findById(userId).populate('addresses');
      const userAddress = await adress.findOne({ userId: user._id });

      // Calculate total
      const total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

      // Fetch available coupons
      const coupons = await Coupon.find({
          isList: true,
          createdOn: { $lte: new Date() },
          expireOn: { $gte: new Date() },
          usedBy: { $ne: userId }
      });

      // Render checkout page with all necessary data
      res.render('checkout', {
          cartItems: cart.items,
          total,
          user,
          addresses: userAddress,
          coupons,
          messages: {
              success: req.flash('success'),
              error: req.flash('error')
          }
      });

  } catch (error) {
      console.error('Error loading checkout page:', error);
      req.flash('error', 'Error loading checkout page');
      return res.redirect('/shopping-cart');
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
  orderHistory
};
