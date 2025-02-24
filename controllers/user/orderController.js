const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const adress = require("../../models/addressSchema");
const mongoose = require("mongoose");
const address = require("../../models/addressSchema");
const razorpay = require("../../config/razorpay");
const Wallet = require("../../models/walletSchema");
require("dotenv").config();

const orderView = async (req, res) => {
  try {
    const { orderId } = req.query; // Changed from productId to orderId
    console.log("Order ID:", orderId);

    // Find the order using the orderId
    const order = await Order.findById(orderId)
      .populate({
        path: "products.productId",
        select: "productName image1 status salePrice", // Only select necessary fields for the product
      })
      .populate({
        path: "shippingAddress", // Populate the shippingAddress field
        select: "name city state pincode phone altPhone", // Select necessary fields from the address
      });
    res.send(order);
    return;
    // If no order is found, send a 404 response
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    // Log the specific order document for debugging
    console.log("Order details:", order);

    // Render the order details in the template
    const a = await adress.findOne(
      {
        userId: order.userId,
        "address._id": new mongoose.Types.ObjectId(order.shippingAddress),
      },
      { "address.$": 1 }
    );

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


const loadOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user })
      .populate({
        path: 'products.productId',
        select: 'productName image1'
      });

    res.render("orderhistory", { orders });

  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).send('Internal Server Error');
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    
    // Update the stock of each product variant based on the order quantity
    await Promise.all(order.products.map(async (item) => {
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    }));

    // Update or create user's wallet with the order amount
    const userId = order.userId; // Assuming order has userId field
    const wallet = await Wallet.findOne({ userId }); // Assuming you have a Wallet model

    const refundAmount = order.totalAmount; // Assuming totalAmount is available in the order

    if (wallet) {
      // If wallet exists, update the balance and add a transaction record
      wallet.balance += refundAmount; // Assuming wallet has a balance field
      wallet.transactions.push({
        amount: refundAmount,
        type: 'credit', // Indicating this is a credit transaction
        date: new Date(),
        description: `Refund for cancelled order ${orderId}`
      });
      await wallet.save();
    } else {
      // If wallet does not exist, create a new wallet with the transaction record
      const newWallet = new Wallet({
        userId,
        balance: refundAmount,
        transactions: [{
          amount: refundAmount,
          type: 'credit',
          date: new Date(),
          description: `Refund for cancelled order ${orderId}`
        }]
      });
      await newWallet.save();
    }

    order.status = 'Cancelled'; 
    await order.save();
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Order cancellation failed' });
  }
};  

const returnOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);  
    order.status = 'Returned';
    await order.save();
    res.json({ success: true, message: 'Order returned successfully' });
  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).json({ success: false, message: 'Order return failed' });
  }
};  
module.exports = {
  cancelOrder,
  returnOrder,
  loadOrderHistory, 
  orderView,
  orderHistory,
  orderPlaced,
  createOrder,
  processPayment,
};
