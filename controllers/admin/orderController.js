const Order = require("../../models/orderSchema");
const path = require("path");
const Product = require("../../models/productSchema");


const adminOrderView = async (req, res) => {
  try {
    // Get pagination parameters from query string with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);
    
    // Fetch orders with pagination
    const orders = await Order.find()
      .populate({
        path: "products.productId",
        select: "productName image1 status salePrice",
      })
      .populate({
        path: "shippingAddress",
        select: "name city state pincode phone altPhone",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (!orders) {
      return res.status(404).send({ message: "No orders found" });
    }

    // Check if product images are properly populated
    orders.forEach(order => {
      order.products.forEach(product => {
        if (product.productId && !product.productId.image1.startsWith('http')) {
          // If image path doesn't have a full URL, ensure it has the correct path
          if (!product.productId.image1.startsWith('/')) {
            product.productId.image1 = '/' + product.productId.image1;
          }
        }
      });
    });
    
    console.log("Rendering ordermanage.ejs with orders:", orders);
    res.render(path.join(__dirname, "../../views/admin/ordermanage.ejs"), {
      orders,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        totalOrders: totalOrders,
        limit: limit
      }
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
