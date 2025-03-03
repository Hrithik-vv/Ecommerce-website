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
const Razorpay = require('razorpay');
const Coupon = require("../../models/couponSchema");

require("dotenv").config();

// Initialize Razorpay
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
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
        console.log('Create order request received:', req.body);
        const { totalAmount, selectedAddressId, couponCode } = req.body;
        const userId = req.user._id;

        if (!totalAmount || !selectedAddressId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate cart
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(totalAmount * 100), // amount in smallest currency unit (paise)
            currency: 'INR',
            receipt: `receipt_${Date.now()}`
        };

        console.log('Creating Razorpay order with options:', options);
        
        const order = await razorpayInstance.orders.create(options);
        console.log('Razorpay order created:', order);

        // Store order details in session for later verification
        req.session.razorpayOrderDetails = {
            orderId: order.id,
            amount: totalAmount,
            selectedAddressId,
            couponCode,
            cartItems: cart.items
        };

        return res.status(200).json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            order: order
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
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
      totalAmount
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
        paymentMethod: 'razorpay',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        status: 'Confirmed'
      });

      // Clear cart after successful order
      await Cart.findOneAndUpdate(
        { userId: req.session.user._id },
        { $set: { items: [] } }
      );

      res.json({
        success: true,
        message: 'Payment verified successfully',
        orderId: newOrder._id
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
};

const processPayment = async (req, res) => {
    try {
        console.log('Payment verification request received:', req.body);
        const { 
            razorpay_payment_id, 
            razorpay_order_id, 
            razorpay_signature,
            selectedAddressId,
            couponCode,
            products,
            totalAmount
        } = req.body;
        
        const userId = req.user._id;
        
        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            console.error('Signature verification failed');
            return res.status(400).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        console.log('Signature verified successfully');

        // Get cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Your cart is empty'
            });
        }

        // Create order in database with valid enum values
        const newOrder = new Order({
            couponId: couponCode,
            userId: userId,
            products: cart.items.map(item => ({
                productId: item.productId._id,
                variantId: item.variantId,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
                color: item.color,
                size: item.size,
            })),
            totalAmount: totalAmount,
            shippingAddress: selectedAddressId,
            paymentMethod: "Razorpay",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            status: "Pending",
            paymentStatus: "completed",
        });

        await newOrder.save();
        console.log('Order saved to database:', newOrder);

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
            message: 'Payment successful',
            orderId: newOrder._id
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing payment',
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
        // Create a new wallet only if it doesn't exist
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
        console.log('Return request received:', { orderId, productId, returnReason, returnComments });

        // Find the order
        const order = await Order.findById(orderId);
        console.log('Order lookup result:', order ? 'Found' : 'Not Found');
        
        if (!order) {
            console.log('Order not found with ID:', orderId);
            req.flash('error', 'Order not found');
            return res.redirect('/order-history');
        }

        // Find the specific product in the order
        const productToReturn = order.products.find(
            product => {
                console.log('Comparing product IDs:', {
                    productId: productId,
                    currentProduct: product.productId.toString()
                });
                return product.productId.toString() === productId;
            }
        );

        console.log('Product lookup result:', productToReturn ? 'Found' : 'Not Found');

        if (!productToReturn) {
            console.log('Product not found in order. Product ID:', productId);
            req.flash('error', 'Product not found in order');
            return res.redirect('/order-history');
        }

        // Check if product is already returned
        if (productToReturn.isReturned) {
            console.log('Product already returned:', productId);
            req.flash('error', 'Product is already returned');
            return res.redirect('/order-history');
        }

        // Update the product status in the order
        productToReturn.isReturned = true;
        productToReturn.returnReason = returnReason;
        productToReturn.returnComments = returnComments;
        productToReturn.returnRequestDate = new Date();
        productToReturn.returnStatus = 'Pending';

        console.log('Saving order with return request...');
        // Save the updated order
        await order.save();
        console.log('Order saved successfully');

        // Redirect back to order history with success message
        req.flash('success', 'Return request submitted successfully');
        res.redirect('/order-history');
    } catch (error) {
        console.error('Error processing return request:', error);
        req.flash('error', 'Failed to process return request');
        res.redirect('/order-history');
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
  verifyPayment,
  processPayment,
  returnProduct
};
