const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const Razorpay = require("razorpay");
const { generateTransactionId } = require("../../utils/transactionUtils");
const { generateOrderId } = require("../../utils/orderUtils");
const Wallet = require("../../models/walletschema");
const User = require("../../models/userSchema");
const address = require("../../models/addressSchema");
const crypto = require("crypto");

require("dotenv").config();

// Initialize Razorpay
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const orderView = async (req, res) => {
  try {
    const { orderId } = req.query;
    console.log("Order ID:", orderId);

    // Find the order using the orderId
    const order = await Order.findById(orderId)
      .populate({
        path: "products.productId",
        select: "productName image1 status salePrice",
      })
      .populate({
        path: "shippingAddress",
        select: "name city state pincode phone altPhone",
      });
    
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Log the specific order document for debugging
    console.log("Order details:", order);

    // Render the order details in the template
    const a = await address.findOne(
      {
        userId: order.userId,
        "address._id": new mongoose.Types.ObjectId(order.shippingAddress),
      },
      { "address.$": 1 }
    );

    // Ensure we have default values for checkout summary fields if they don't exist
    if (!order.originalSubtotal) {
      order.originalSubtotal = order.totalAmount;
    }
    
    if (!order.subtotal) {
      order.subtotal = order.totalAmount - (order.deliveryCharge || 40);
    }
    
    if (!order.productDiscount) {
      order.productDiscount = 0;
    }
    
    if (!order.deliveryCharge) {
      order.deliveryCharge = 40;
    }

    res.render("orderview", { order, address: a.address[0] });
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

    // Find orders that contain any of the given productIds and sort by newest first
    const orders = await Order.find({
      "products.productId": { $in: objectIds },
    })
      .populate("products.productId")
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

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

const createOrder = async (req, res) => {
  try {
    console.log("Create order request received:", req.body);
    const { totalAmount, selectedAddressId, couponCode } = req.body;
    const userId = req.user?._id || req.session.user._id

    if (!totalAmount || !selectedAddressId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Check stock availability for all cart items
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
      return res.status(400).json({
        success: false,
        error: "stockIssue",
        outOfStockItems
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(totalAmount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    console.log("Creating Razorpay order with options:", options);

    const order = await razorpayInstance.orders.create(options);
    console.log("Razorpay order created:", order);

    // Store order details in session for later verification
    req.session.razorpayOrderDetails = {
      orderId: order.id,
      amount: totalAmount,
      selectedAddressId,
      couponCode,
      cartItems: cart.items,
    };

    return res.status(200).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order: order,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
      cartItems,
      totalAmount,
    } = req.body;

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is verified, create order in your database
      const newOrder = await Order.create({
        userId: req.session.user._id,
        products: cartItems,
        totalAmount: totalAmount,
        shippingAddress: addressId,
        paymentMethod: "razorpay",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: "Confirmed",
      });

      // Clear cart after successful order
      await Cart.findOneAndUpdate(
        { userId: req.session.user._id },
        { $set: { items: [] } }
      );

      res.json({
        success: true,
        message: "Payment verified successfully",
        orderId: newOrder._id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
    });
  }
};

const processPayment = async (req, res) => {
  try {
    console.log("Payment verification request received:", req.body);
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      selectedAddressId,
      couponCode,
      products,
      totalAmount,
      originalSubtotal,
      productDiscount,
      subtotal,
      deliveryCharge
    } = req.body;

    // Get userId from either req.user or req.session.user
    let userId;
    if (req.user && req.user._id) {
      userId = req.user._id;
    } else if (req.session && req.session.user) {
      userId = req.session.user;
    } else {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("Signature verification failed");
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }

    console.log("Signature verified successfully");

    // Get cart items
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    // Create order in database with valid enum values
    const newOrder = new Order({
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
      // Include checkout summary
      originalSubtotal: originalSubtotal || cart.items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0),
      productDiscount: productDiscount || 0,
      subtotal: subtotal || cart.items.reduce((sum, item) => sum + item.totalPrice, 0),
      deliveryCharge: deliveryCharge || 40,
      totalAmount: totalAmount,
      shippingAddress: selectedAddressId,
      paymentMethod: "Razorpay",
      paymentStatus: "completed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    await newOrder.save();
    console.log("Order saved to database:", newOrder);

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

    return res.status(200).json({
      success: true,
      message: "Payment successful",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing payment",
      error: error.message,
    });
  }
};

const loadOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user })
      .populate({
        path: "products.productId",
        select: "productName image1",
      })
      .sort({ createdAt: -1 }); // Sort by creation date, newest first

    res.render("orderhistory", { orders });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).send("Internal Server Error");
  }
};

const checkWalletBalance = async (userId) => {
  try {
    // Find wallet or create one if it doesn't exist
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
      await wallet.save();
    }
    
    return wallet.balance;
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    throw error;
  }
};

const processWalletPayment = async (req, res) => {
  try {
    const { selectedAddressId, couponCode, products, totalAmount, originalSubtotal, productDiscount, subtotal, deliveryCharge } = req.body;
    const userId = req.user?._id || req.session.user._id;

    // Find user and check wallet balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.wallet < totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        currentBalance: user.wallet
      });
    }

    // Validate cart and check stock
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty"
      });
    }

    // Check stock availability for all cart items
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
      return res.status(400).json({
        success: false,
        error: "stockIssue",
        outOfStockItems
      });
    }

    // Create a new order
    const order = new Order({
      couponId: couponCode,
      userId,
      products: cart.items.map(item => ({
        name: item.productId.productName,
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        color: item.color,
        size: item.size
      })),
      originalSubtotal: originalSubtotal || 0,
      productDiscount: productDiscount || 0,
      subtotal: subtotal || 0,
      deliveryCharge: deliveryCharge || 40,
      totalAmount,
      shippingAddress: selectedAddressId,
      paymentMethod: "Wallet",
      paymentStatus: "completed"
    });

    await order.save();

    // Update user's wallet balance
    user.wallet -= totalAmount;
    await user.save();

    // Create a wallet transaction record
    const walletTransaction = new WalletTransaction({
      userId,
      amount: -totalAmount,
      type: "debit",
      description: `Payment for order #${order._id}`,
      orderId: order._id
    });

    await walletTransaction.save();

    // Apply coupon if used
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

    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      orderId: order._id
    });
  } catch (error) {
    console.error("Error processing wallet payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing payment"
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    // Convert string IDs to ObjectId
    const { orderId, productId } = req.body; // Changed from req.params to req.body based on client-side code
    
    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Order ID and Product ID are required"
      });
    }

    
    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const order = await Order.findById(orderObjectId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Find the specific product in the order
    const productToCancel = order.products.find(
      product => product.productId.toString() === productObjectId.toString()
    );

    if (!productToCancel) {
      return res.status(404).json({
        success: false,
        message: "Product not found in this order"
      });
    }

    // Check if product is already cancelled
    if (productToCancel.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Product is already cancelled"
      });
    }

    // Calculate refund amount for this specific product
    const refundAmount = productToCancel.totalPrice;

    // Update only the specific product's status
    productToCancel.status = "Cancelled";
    
    // If payment was made through Razorpay or Wallet and completed, process refund to wallet
    if ((order.paymentMethod === "Razorpay" || order.paymentMethod === "Wallet") && order.paymentStatus === "completed") {
      const userId = order.userId;

      if (typeof refundAmount !== "number") {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid refund amount" 
        });
      }

      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({
          userId,
          balance: refundAmount,
          transactions: [{
            transactionId: generateTransactionId(),
            amount: refundAmount,
            type: "credit",
            date: new Date(),
            description: `Refund for cancelled product in order ${order.orderId}`
          }]
        });
      } else {
        wallet.balance += refundAmount;
        wallet.transactions.push({
          transactionId: generateTransactionId(),
          amount: refundAmount,
          type: "credit",
          date: new Date(),
          description: `Refund for cancelled product in order ${order.orderId}`
        });
      }

      await wallet.save();
    }

    // Save the updated order
    await order.save();

    res.json({ 
      success: true, 
      message: "Product cancelled successfully",
      refundAmount: refundAmount
    });

  } catch (error) {
    console.error("Error cancelling product:", error);
    res.status(500).json({
      success: false,
      message: "Product cancellation failed",
      error: error.message
    });
  }
};

const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    order.status = "Returned";
    await order.save();
    res.json({ success: true, message: "Order returned successfully" });
  } catch (error) {
    console.error("Error returning order:", error);
    res.status(500).json({ success: false, message: "Order return failed" });
  }
};

const returnProduct = async (req, res) => {
  try {
    const { orderId, productId, returnReason, returnComments } = req.body;
    console.log("Return request received:", {
      orderId,
      productId,
      returnReason,
      returnComments,
    });

    // Find the order
    const order = await Order.findById(orderId);
    console.log("Order lookup result:", order ? "Found" : "Not Found");

    if (!order) {
      console.log("Order not found with ID:", orderId);
      req.flash("error", "Order not found");
      return res.redirect("/order-history");
    }

    // Find the specific product in the order
    const productToReturn = order.products.find((product) => {
      console.log("Comparing product IDs:", {
        productId: productId,
        currentProduct: product.productId.toString(),
      });
      return product.productId.toString() === productId;
    });

    console.log(
      "Product lookup result:",
      productToReturn ? "Found" : "Not Found"
    );

    if (!productToReturn) {
      console.log("Product not found in order. Product ID:", productId);
      req.flash("error", "Product not found in order");
      return res.redirect("/order-history");
    }

    // Check if product is already returned
    if (productToReturn.isReturned) {
      console.log("Product already returned:", productId);
      req.flash("error", "Product is already returned");
      return res.redirect("/order-history");
    }

    // Update the product status in the order
    productToReturn.isReturned = true;
    productToReturn.returnReason = returnReason;
    productToReturn.returnComments = returnComments;
    productToReturn.returnRequestDate = new Date();
    productToReturn.returnStatus = "Pending";

    console.log("Saving order with return request...");
    // Save the updated order
    await order.save();
    console.log("Order saved successfully");

    // Redirect back to order history with success message
    req.flash("success", "Return request submitted successfully");
    res.redirect("/order-history");
  } catch (error) {
    console.error("Error processing return request:", error);
    req.flash("error", "Failed to process return request");
    res.redirect("/order-history");
  }
};

const paymentFailed = async (req, res) => {
  try {
    const userId = req.user?._id || req.session.user._id;
    
    // Get cart items
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty"
      });
    }

    // Calculate total amount from cart items
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
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
    const deliveryCharge = 40;
    const totalAmount = subtotal + deliveryCharge;

    // Create failed order document
    const failedOrder = new Order({
      userId: userId,
      products: cart.items.map(item => ({
        name: item.productId.productName,
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        color: item.color,
        size: item.size
      })),
      originalSubtotal: originalSubtotal,
      productDiscount: productDiscount,
      subtotal: subtotal,
      deliveryCharge: deliveryCharge,
      totalAmount: totalAmount,
      shippingAddress: req.body.selectedAddressId,
      paymentMethod: "Razorpay",
      status: "Failed",
      paymentStatus: "failed"
    });

    await failedOrder.save();

    return res.render('paymentFailed', {
      orderId: failedOrder._id
    });

  } catch (error) {
    console.error("Error handling failed payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error handling failed payment",
      error: error.message
    });
  }
};

const retryPayment = async (req, res) => {
  res.render("orderPlaced");
};


const updatePaymentStatus = async (req, res) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  order.paymentStatus = "completed";
  await order.save();
  res.json({ success: true, message: "Payment status updated successfully" });
};
module.exports = {
  updatePaymentStatus,
  retryPayment,
  paymentFailed,
  cancelOrder,
  returnOrder,
  loadOrderHistory,
  orderView,
  orderHistory,
  orderPlaced,
  createOrder,
  verifyPayment,
  processPayment,
  processWalletPayment,
  checkWalletBalance,
  returnProduct,
};
