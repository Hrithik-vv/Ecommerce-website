const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

//Add to cart Controller
const addToCart = async (req, res) => {
  try {
   
    
    const userId = req.user?._id || req.session.user._id;
    const { productId, variantId, quantity, price } = req.body;
    const missingFields = [];
    if (!productId) missingFields.push("productId");
    if (!variantId) missingFields.push("variantId");
    if (!quantity) missingFields.push("quantity");
    if (!price) missingFields.push("price");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Convert to numbers safely
    const qty = parseInt(quantity, 10);
    const productPrice = parseFloat(price);

    if (isNaN(qty) || qty <= 0 || isNaN(productPrice) || productPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity or price",
      });
    }

    // Find or create cart
    let cart =
      (await Cart.findOne({ userId })) || new Cart({ userId, items: [] });
    // Find existing item with same variant - with null checks
    const itemIndex = cart.items.findIndex((item) => {
      return (
        item &&
        item.productId &&
        item.variantId &&
        item.productId.toString() === productId.toString() &&
        item.variantId.toString() === variantId.toString()
      );
    });

    if (itemIndex > -1) {
      // Update existing item
      cart.items[itemIndex].quantity += qty;
      cart.items[itemIndex].totalPrice =
        cart.items[itemIndex].quantity * productPrice;
    } else {
      // Add new item
      cart.items.push({
        productId,
        variantId,
        quantity: qty,
        productPrice,
        totalPrice: productPrice * qty,
      });
    }

    await cart.save();
    res.redirect("/shopping-cart");
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Export functions correctly
module.exports = { addToCart };

const viewCart = async (req, res) => {
  try {
    const userId = req.user?._id || req.session.user._id
    const cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "productName price image1 image2 image3 image4 variants status"
    );

    console.log("Cart fetched:", cart);

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
    const updatedCartItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (product) {
          // Find matching variant
          const variant = product.variants.find(
            (v) => v._id.toString() === item.variantId?.toString()
          );

          // Assign product details
          item.productStock = variant ? variant.stock : 0;
          item.productImages = {
            image1: product.image1,
            image2: product.image2,
            image3: product.image3,
            image4: product.image4,
          };
          item.productStatus = product.status;
          item.variant = variant;
          
          // Check if stock is sufficient
          item.hasStockIssue = variant && (variant.stock < item.quantity);
          item.stockMessage = item.hasStockIssue 
            ? `Only ${variant.stock} available` 
            : variant.stock < 5 
              ? `Only ${variant.stock} left` 
              : "In stock";

          // Add color and size from variant
          if (variant) {
            item.color = variant.color;
            item.size = variant.size;
          }
        }
        return item;
      })
    );

    // Send updated cart items with product details
    res.render("shopping-cart", {
      cartItems: updatedCartItems,
      messages: {
        success: req.flash("success"),
        error: req.flash("error"),
      },
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
    const userId = req.user?._id || req.session.user._id
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

// Add these new functions
const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user || req.user._id;;

    console.log('ybhjubhjnbjnujnnnnnnnnnnnnnnnnnnnnnnn'+userId);
    const { productId, quantity } = req.body;

    // Ensure the quantity is an integer
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    // Find the cart and product
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Find the item in cart
    const item = cart.items.find(
      (item) => item.productId._id.toString() === productId
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    // Check stock availability before updating
    const product = await Product.findById(item.productId._id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === item.variantId?.toString()
    );

    if (!variant) {
      return res
        .status(404)
        .json({ success: false, message: "Product variant not found" });
    }

    // Check if requested quantity exceeds available stock
    if (qty > variant.stock) {
      return res.json({
        success: false,
        stockIssue: true,
        availableStock: variant.stock,
        message: `Only ${variant.stock} items available in stock`
      });
    }

    // Update quantity and total price
    item.quantity = qty;
    item.totalPrice = qty * item.productPrice;

    // Save the updated cart
    await cart.save();

    // Calculate new cart total
    const cartTotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );

    res.json({
      success: true,
      message: "Quantity updated successfully",
      cartTotal: cartTotal.toFixed(2),
      itemTotal: item.totalPrice.toFixed(2),
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating quantity" });
  }
};

const checkoutController = async (req, res) => {
  try {
    const userId = req.user?._id || req.session.user._id;
    
    if (!userId) {
      if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
      req.flash("error", "User not authenticated");
      return res.redirect("/login");
    }

    if (req.method === "POST") {
      const { selectedAddressId, paymentMethod, couponCode, cartItems } = req.body;

      // Validate cart
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
          return res.status(400).json({ success: false, message: "Your cart is empty" });
        }
        req.flash("error", "Your cart is empty");
        return res.redirect("/shopping-cart");
      }

      // Check product stock availability
      const stockCheckResults = await Promise.all(
        cart.items.map(async (item) => {
          const product = await Product.findById(item.productId._id);
          if (!product) {
            return { 
              available: false, 
              productName: "Unknown product", 
              message: "Product not found" 
            };
          }
          
          const variant = product.variants.find(
            v => v._id.toString() === item.variantId
          );
          
          if (!variant) {
            return { 
              available: false, 
              productName: product.productName, 
              message: "Product variant not found" 
            };
          }
          
          const isAvailable = variant.stock >= item.quantity;
          return { 
            available: isAvailable, 
            productName: product.productName,
            color: variant.color,
            size: variant.size,
            requestedQty: item.quantity,
            availableStock: variant.stock,
            message: isAvailable ? "In stock" : "Insufficient stock"
          };
        })
      );
      
      // Check if any product has insufficient stock
      const outOfStockItems = stockCheckResults.filter(item => !item.available);
      if (outOfStockItems.length > 0) {
        return res.json({
          success: false,
          error: "stockIssue",
          outOfStockItems
        });
      }

      // Validate address
      if (!selectedAddressId) {
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
          return res.status(400).json({ success: false, message: "Please select a delivery address" });
        }
        req.flash("error", "Please select a delivery address");
        return res.redirect("/checkout");
      }

      // Calculate total amount from cart items
      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );

      // Calculate original subtotal and product discount
      const originalSubtotal = cart.items.reduce(
        (sum, item) => {
          const variant = item.productId.variants.find(v => v._id.toString() === item.variantId);
          const originalPrice = variant ? variant.price : item.productPrice;
          return sum + (originalPrice * item.quantity);
        },
        0
      );
      
      const productDiscount = originalSubtotal - subtotal;

      // Add delivery charge
      const totalAmount = subtotal + 40;

      if (paymentMethod === "razorpay") {
        return res.json({
          success: true,
          totalAmount,
          addressId: selectedAddressId,
          couponCode,
          cartItems: cart.items,
          originalSubtotal,
          productDiscount,
          subtotal,
          deliveryCharge: 40
        });
      }

      // For COD, validate order amount
      if (paymentMethod === "cod" && totalAmount > 1000) {
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
          return res.status(400).json({ 
            success: false, 
            message: "Cash on Delivery is not available for orders above ₹1,000. Please choose online payment." 
          });
        }
        req.flash("error", "Cash on Delivery is not available for orders above ₹1,000. Please choose online payment.");
        return res.redirect("/checkout");
      }

      // For COD, continue with order creation
      try {
        const order = new Order({
          couponId: couponCode,
          userId: userId,
          products: cart.items.map((item) => ({
            name: item.productId.productName,
            productId: item.productId._id,
            variantId: item.variantId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            color: item.color,
            size: item.size,
          })),
          originalSubtotal: originalSubtotal,
          productDiscount: productDiscount,
          subtotal: subtotal,
          deliveryCharge: 40,
          totalAmount: totalAmount,
          shippingAddress: selectedAddressId,
          paymentMethod: "COD",
          status: "Pending",
          paymentStatus: "pending",
        });

        await order.save();

        // Handle coupon if provided
        if (couponCode) {
          await Coupon.findOneAndUpdate(
            { name: new RegExp("^" + couponCode + "$", "i") },
            { $addToSet: { usedBy: userId } },
            { new: true }
          );
        }

        // Update product stocks
        await Promise.all(
          cart.items.map(async (item) => {
            await Product.updateOne(
              { _id: item.productId._id, "variants._id": item.variantId },
              { $inc: { "variants.$.stock": -item.quantity } }
            );
          })
        );

        // Clear cart
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
          return res.json({
            success: true,
            message: "Order placed successfully",
            redirect: "/order-placed"
          });
        }
        
        req.flash("success", "Order placed successfully!");
        return res.redirect("/order-placed");
      } catch (error) {
        console.error("Error creating order:", error);
        if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
          return res.status(500).json({
            success: false,
            message: "Error creating order",
            error: error.message
          });
        }
        req.flash("error", "Error creating order");
        return res.redirect("/checkout");
      }
    }

    // GET request - show checkout page
    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      select: "productName price image1 image2 image3 image4 variants status offer category"
    }).populate({
      path: "items.productId.category",
      select: "categoryOffer"
    });
    const addresses = await Address.findOne({ userId });
    const userData = await User.findById(userId);

    // Calculate total amount from cart items and add variant details
    let subtotal = 0;
    let cartItemsWithVariants = [];
    
    if (cart && cart.items) {
      cartItemsWithVariants = await Promise.all(cart.items.map(async (item) => {
        const variant = item.productId.variants.find(v => v._id.toString() === item.variantId);
        const originalPrice = variant ? variant.price : item.productPrice;
        const maxOffer = Math.max(
          item.productId.offer || 0,
          item.productId.category?.categoryOffer || 0
        );
        const discountedPrice = originalPrice * (1 - maxOffer / 100);
        
        return {
          ...item.toObject(),
          color: variant ? variant.color : '',
          size: variant ? variant.size : '',
          originalPrice: originalPrice,
          offerPercentage: maxOffer,
          discountedPrice: discountedPrice,
          totalOriginalPrice: originalPrice * item.quantity,
          totalDiscountedPrice: discountedPrice * item.quantity
        };
      }));
      
      subtotal = cartItemsWithVariants.reduce((total, item) => {
        return total + item.totalDiscountedPrice;
      }, 0);
    }

    // Get available coupons
    const coupons = await Coupon.find({
      isList: true,
      createdOn: { $lte: new Date() },
      expireOn: { $gte: new Date() },
      usedBy: { $ne: userId },
    });

    res.render("checkOut", {
      user: userData,
      addresses: addresses ? addresses.address : [],
      cartItems: cartItemsWithVariants,
      selectedAddress: req.session.selectedAddress,
      coupons: coupons,
      totalAmount: subtotal + 40,
      total: subtotal,
      messages: {
        success: req.flash("success"),
        error: req.flash("error"),
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
      return res.status(500).json({
        success: false,
        message: "Error processing checkout",
        error: error.message
      });
    }
    req.flash("error", "Error processing checkout");
    res.redirect("/shopping-cart");
  }
};

const orderView = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    console.log("Order ID:", orderId);

    // Find the order using the orderId
    const order = await Order.findOne({
      orderId: orderId,
    }).populate({
      path: "products.productId",
      select: "productName image1 status salePrice",
    });
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    const orderProduct = order.products[0];
    if (!orderProduct) {
      return res.status(404).send("Product not found in the order.");
    }

    // Get full product details
    const product = {
      ...orderProduct.productId.toObject(),
      quantity: orderProduct.quantity,
      status: orderProduct.productId.status,
    };

    const address = await Address.findOne({
      userId: new mongoose.Types.ObjectId(order.userId),
    });

    if (!address) {
      console.log("No address found for userId:", order.userId);
      return res.status(404).send("Address not found.");
    }

    const neededAddress = address.address.find(
      (addr) => addr._id.toString() == order.shippingAddress
    );

    res.render("orderview", {
      product,
      order,
      address: neededAddress,
    });
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
    let { productId } = req.query;

    if (!productId) {
      req.session.message = { type: "error", text: "Product ID is required" };
      return res.redirect("/orderhistory");
    }

    // Ensure productId is always an array
    if (typeof productId === "string") {
      productId = productId.split(",");
    }

    // Convert productId values to ObjectId
    const objectIds = productId
      .map((id) => {
        try {
          return new mongoose.Types.ObjectId(id.trim());
        } catch (err) {
          console.error("Invalid ObjectId:", id);
          return null;
        }
      })
      .filter((id) => id !== null);

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
  addToCart,
  viewCart,
  removeFromCart,
  updateQuantity,
  checkoutController,
  orderView,
  orderPlaced,
  orderHistory,
};
