const Order = require("../../models/orderSchema");
const path = require("path");
const Product = require("../../models/productSchema");


const adminOrderView = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orders = await Order.find()
      .populate({
        path: "products.productId",
        select: "productName image1 status salePrice",
      })
      .populate({
        path: "shippingAddress",
        select: "name city state pincode phone altPhone",
      })
      .sort({ createdAt: -1 });

    if (!orders) {
      return res.status(404).send({ message: "Order not found" });
    }
    const message = ";;;;;;;;";
    console.log("Rendering ordermanage.ejs with orders:", orders);
    res.render(path.join(__dirname, "../../views/admin/ordermanage.ejs"), {
      orders,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};


// Update order status using form submission
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;
    if (!orderId || !newStatus) {
      return res.status(400).send("Missing required fields");
    }

    // Find order and update status
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: newStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Redirect back to the order management page
    res.redirect("/admin/ordermanage");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { adminOrderView, updateOrderStatus };
