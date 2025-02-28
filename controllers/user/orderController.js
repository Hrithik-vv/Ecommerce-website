const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const adress = require("../../models/addressSchema");
const mongoose = require("mongoose");
const address = require("../../models/addressSchema");
const razorpay = require("../../config/razorpay");
const Wallet = require("../../models/walletSchema");
const crypto = require("crypto");

require("dotenv").config();

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
    res.send(order);
    return;
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

const createOrder = async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;

    // Check if required fields are missing
    if (!amount || !currency || !receipt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const options = {
      amount: amount * 100,
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
    console.error("Razorpay order creation error:", err);
    res
      .status(500)
      .json({ error: "Payment processing failed", details: err.message });
  }
};

const processPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      products,
      addressId,
    } = req.body;

    console.log("Payment verification request body:", JSON.stringify(req.body, null, 2));
    
    // Verify all required fields are present
    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, message: "Missing razorpay_payment_id" });
    }
    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Missing razorpay_order_id" });
    }
    if (!razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing razorpay_signature" });
    }

    // Create the signature string to use for verification
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;
    console.log("Signature string:", signatureString);
    
    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signatureString)
      .digest("hex");

    console.log("Expected Signature:", expectedSignature);
    console.log("Received Signature:", razorpay_signature);

    // Compare signatures
    const isValidSignature = expectedSignature === razorpay_signature;
    console.log("Signature valid:", isValidSignature);

    if (!isValidSignature) {
      return res.status(400).json({ 
        success: false, 
        message: "Payment verification failed: Invalid signature"
      });
    }

    // Validate Products
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid products data" 
      });
    }

    // Make sure product quantities are valid numbers
    const validProducts = products.map(p => ({
      ...p,
      quantity: parseInt(p.quantity) || 1 
    }));

    // Fetch actual prices from DB
    const productIds = validProducts.map(p => p.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    if (dbProducts.length !== validProducts.length) {
      return res.status(400).json({ 
        success: false, 
        message: "Some products not found in database" 
      });
    }

    // Create product data with validated prices and quantities
    const orderProducts = [];
    let totalAmount = 0;

    for (const item of validProducts) {
      const dbProduct = dbProducts.find(p => p._id.toString() === item.productId);
      
      if (!dbProduct) {
        return res.status(400).json({ 
          success: false, 
          message: `Product not found: ${item.productId}` 
        });
      }
      
      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for product: ${dbProduct.name || item.productId}` 
        });
      }
      
      const productPrice = parseFloat(dbProduct.price);
      if (isNaN(productPrice)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid price for product: ${dbProduct.name || item.productId}` 
        });
      }
      
      const itemTotalPrice = productPrice * item.quantity;
      
      orderProducts.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        totalPrice: itemTotalPrice,
        color: item.color || null,
        size: item.size || null,
      });
      
      totalAmount += itemTotalPrice;
    }

    // Double check that totalAmount is valid
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid total amount calculated" 
      });
    }

    console.log("Order products:", orderProducts);
    console.log("Total amount:", totalAmount);

    // Create Order
    const order = new Order({
      userId,
      products: orderProducts,
      totalAmount: totalAmount,
      paymentMethod: "Razorpay",
      paymentStatus: "completed",
      status: "Pending",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      shippingAddress: addressId,
    });

    await order.save();

    // Clear Cart
    await Cart.findOneAndDelete({ userId });

    // Update Stock
    for (const item of orderProducts) {
      await Product.findByIdAndUpdate(item.productId, { 
        $inc: { stock: -item.quantity } 
      });
    }

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Order creation failed", 
      error: error.message 
    });
  }
};


const loadOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.session.user }).populate({
      path: "products.productId",
      select: "productName image1",
    });

    res.render("orderhistory", { orders });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Order ID" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // If order is already cancelled, prevent duplicate actions
    if (order.status === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Order is already cancelled" });
    }

    // Cancel the order first
    order.status = "Cancelled";
    await order.save();

    // Check if the payment method is Razorpay and the payment status is paid
    if (order.paymentMethod === "Razorpay" && order.paymentStatus === "Paid") {
      const userId = order.userId;
      const refundAmount = order.totalAmount;

      if (typeof refundAmount !== "number") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid refund amount" });
      }

      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        // Create a new wallet only if it doesn’t exist
        wallet = new Wallet({
          userId,
          balance: refundAmount,
          transactions: [
            {
              amount: refundAmount,
              type: "credit",
              date: new Date(),
              description: `Refund for cancelled order ${orderId}`,
            },
          ],
        });
      } else {
        // Update existing wallet balance
        wallet.balance += refundAmount;
        wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          date: new Date(),
          description: `Refund for cancelled order ${orderId}`,
        });
      }

      await wallet.save();
    }

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Order cancellation failed",
        error: error.message,
      });
  }
};

// const cancelOrder = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const order = await Order.findById(orderId);

//     // Update the stock of each product variant based on the order quantity
//     await Promise.all(order.products.map(async (item) => {
//       await Product.updateOne(
//         { _id: item.productId, "variants._id": item.variantId },
//         { $inc: { "variants.$.stock": item.quantity } }
//       );
//     }));

//     // Update or create user's wallet with the order amount
//     const userId = order.userId; // Assuming order has userId field
//     const wallet = await Wallet.findOne({ userId }); // Assuming you have a Wallet model

//     const refundAmount = order.totalAmount; // Assuming totalAmount is available in the order

//     if (wallet) {
//       // If wallet exists, update the balance and add a transaction record
//       wallet.balance += refundAmount; // Assuming wallet has a balance field
//       wallet.transactions.push({
//         amount: refundAmount,
//         type: 'credit', // Indicating this is a credit transaction
//         date: new Date(),
//         description: `Refund for cancelled order ${orderId}`
//       });
//       await wallet.save();
//     } else {
//       // If wallet does not exist, create a new wallet with the transaction record
//       const newWallet = new Wallet({
//         userId,
//         balance: refundAmount,
//         transactions: [{
//           amount: refundAmount,
//           type: 'credit',
//           date: new Date(),
//           description: `Refund for cancelled order ${orderId}`
//         }]
//       });
//       await newWallet.save();
//     }

//     order.status = 'Cancelled';
//     await order.save();
//     res.json({ success: true, message: 'Order cancelled successfully' });
//   } catch (error) {
//     console.error('Error cancelling order:', error);
//     res.status(500).json({ success: false, message: 'Order cancellation failed' });
//   }
// };

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
