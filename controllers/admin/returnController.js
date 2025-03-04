const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");

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

    // Find the order and update the return status
    const order = await Order.findById(orderId).populate("userId");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Find the specific product in the order
    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
    }

    // Update return status
    product.returnStatus = action;

    // If approved, process refund to wallet
    if (action === "Approved") {
      const refundAmount = product.totalPrice; // Get the product's price

      // Find or create wallet
      let wallet = await Wallet.findOne({ userId: order.userId._id });

      if (!wallet) {
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
      console.log(
        `Refunded ${refundAmount} to wallet for user ${order.userId._id}`
      );

      // Update order status
      product.isRefunded = true;
      order.status = "Returned";
    }

    await order.save();

    res.json({
      success: true,
      message: `Return request ${action.toLowerCase()}${
        action === "Approved" ? " and refund processed" : ""
      }`,
    });
  } catch (error) {
    console.error("Error handling return:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  returnManagement,
  handleReturn,
};
