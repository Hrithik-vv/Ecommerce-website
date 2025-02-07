const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const adress = require("../../models/addressSchema");
const mongoose = require("mongoose");
const address = require("../../models/addressSchema");
const razorpay = require("../../config/razorpay");
require("dotenv").config();

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

//Razorpay Management
const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, currency, receipt } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency,
      receipt,
      payment_capture: 1,
    };

    const response = await razorpay.orders.create(options);
    res.json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (err) {
    console.error("Razorpay error:", err);
    res.status(500).json({ error: "Payment processing failed" });
  }
};

const processPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, products, addressId } = req.body;
    const userId = req.user._id;

    // Verification logic
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Create order
    const order = new Order({
      userId,
      products: products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        price: p.price
      })),
      totalAmount: products.reduce((sum, p) => sum + (p.quantity * p.price), 0),
      paymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      shippingAddress: addressId
    });

    await order.save();
    
    // Clear cart
    await Cart.findOneAndDelete({ userId });
    
    // Update product stock
    for (const item of products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    res.json({ success: true, orderId: order._id });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, message: 'Order creation failed' });
  }
};

module.exports = {
  orderView,
  orderHistory,
  orderPlaced,
  createOrder,
  processPayment,
};
