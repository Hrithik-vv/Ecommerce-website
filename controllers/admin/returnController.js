const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productSchema");

const returnManagement = async (req, res) => {
  try {
    // Find all orders with return requests
    const orders = await Order.find({
      "products.isReturned": true,
    })
      .populate("userId", "name email")
      .populate("products.productId");

    // Format the data for the view
    const returnItems = [];
    orders.forEach((order) => {
      order.products.forEach((product) => {
        if (product.isReturned) {
          returnItems.push({
            order: {
              _id: order._id,
              orderId: order.orderId,
            },
            product: product.productId,
            quantity: product.quantity,
            customer: order.userId,
            returnReason: product.returnReason,
            returnComments: product.returnComments,
            returnRequestDate: product.returnRequestDate,
            returnStatus: product.returnStatus,
          });
        }
      });
    });

    // Sort returns by request date (newest first)
    returnItems.sort((a, b) => b.returnRequestDate - a.returnRequestDate);

    res.render("returnManagement", { returnItems });
  } catch (error) {
    console.error("Error in return management:", error);
    res.status(500).send("Internal Server Error");
  }
};

const handleReturn = async (req, res) => {
  try {
    const { orderId, productId, action } = req.body;
    console.log('Received return request:', { orderId, productId, action });

    // Find the order and update the return status
    const order = await Order.findById(orderId).populate("userId");
    console.log('Found order:', order ? 'Yes' : 'No');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Find the specific product in the order
    const productIndex = order.products.findIndex(
      (p) => p.productId.toString() === productId
    );
    console.log('Product index in order:', productIndex);

    if (productIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found in order" 
      });
    }

    // Get the product from the order
    const product = order.products[productIndex];

    // Update return status
    product.returnStatus = action;
    console.log('Updated return status to:', action);

    // If approved, process refund to wallet
    if (action === "Approved") {
      const refundAmount = product.totalPrice;
      console.log('Processing refund amount:', refundAmount);

      // Find or create wallet
      let wallet = await Wallet.findOne({ userId: order.userId._id });
      console.log('Found existing wallet:', wallet ? 'Yes' : 'No');

      if (!wallet) {
        console.log('Creating new wallet for user');
        wallet = new Wallet({
          userId: order.userId._id,
          balance: 0,
          transactions: [],
        });
      }

      // Add refund amount to wallet
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: "credit",
        description: `Refund for returned product from order ${order.orderId}`,
        date: new Date(),
      });

      await wallet.save();
      console.log('Wallet updated successfully');

      // Update order status
      product.isRefunded = true;
      order.status = "Returned";
      console.log('Order status updated to Returned');
    }

    await order.save();
    console.log('Order saved successfully');

    res.json({
      success: true,
      message: `Return request ${action.toLowerCase()}${
        action === "Approved" ? " and refund processed" : ""
      }`,
    });
  } catch (error) {
    console.error("Error handling return:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  returnManagement,
  handleReturn,
};
