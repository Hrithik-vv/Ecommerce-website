const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const salesReportController = {
  // Get basic dashboard stats for the main dashboard
  getDashboardStats: async (req, res) => {
    try {
      let { startDate, endDate } = req.body;

      // Set default dates if not provided
      if (!startDate || !endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = today.toISOString();

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        endDate = tomorrow.toISOString();
      }

      // Rest of your function remains the same
      startDate = new Date(startDate);
      endDate = new Date(endDate);
  
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const orders = await Order.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $ne: "Cancelled" },
      });

     
      const totalCustomers = await User.countDocuments({ isBlocked: false });

      const totalProducts = await Product.countDocuments({ status: "Listed" });

      // Calculate summary statistics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );

      res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          totalCustomers,
          totalProducts,
        },
      });
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching dashboard stats",
        error: error.message,
      });
    }
  },

  // Get Dashboard Data for sales report page
  getDashboardData: async (req, res) => {
    try {
      const period = req.params.period || 'monthly';
      const today = new Date();
      let startDate, endDate;
      let labels = [];
      let salesData = [];

      // Set up date ranges and labels
      switch (period) {
        case 'weekly':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 6);
          endDate = new Date(today);
          
          // Generate last 7 days
          for (let i = 0; i < 7; i++) {
            let date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            salesData.push(0); 
          }
          break;

        case 'monthly':
          startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
          endDate = new Date(today);
          
          // Generate last 12 months
          for (let i = 0; i < 12; i++) {
            let date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            salesData.push(0); 
          }
          break;

        case 'yearly':
          startDate = new Date(today.getFullYear() - 4, 0, 1);
          endDate = new Date(today);
          
          // Generate last 5 years
          for (let i = 0; i < 5; i++) {
            labels.push((startDate.getFullYear() + i).toString());
            salesData.push(0); 
          }
          break;
      }

      // Fetch orders
      const orders = await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "Cancelled" }
      }).populate({
        path: 'products.productId',
        populate: {
          path: 'category',
          select: 'name'
        }
      });

      // Calculate sales data based on period
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        let index;

        switch (period) {
          case 'weekly':
            // Calculate days difference
            index = Math.floor((orderDate - startDate) / (1000 * 60 * 60 * 24));
            if (index >= 0 && index < 7) {
              salesData[index] += order.totalAmount;
            }
            break;

          case 'monthly':
            // Calculate months difference
            index = (orderDate.getFullYear() - startDate.getFullYear()) * 12 
              + (orderDate.getMonth() - startDate.getMonth());
            if (index >= 0 && index < 12) {
              salesData[index] += order.totalAmount;
            }
            break;

          case 'yearly':
            // Calculate years difference
            index = orderDate.getFullYear() - startDate.getFullYear();
            if (index >= 0 && index < 5) {
              salesData[index] += order.totalAmount;
            }
            break;
        }
      });

      // Track product and category sales
      const productSalesMap = new Map();
      const categorySalesMap = new Map();

      // Process orders for product and category statistics
      orders.forEach(order => {
        order.products.forEach(product => {
          if (!product.productId) return;

          // Track product sales
          const productId = product.productId._id.toString();
          if (!productSalesMap.has(productId)) {
            productSalesMap.set(productId, {
              name: product.productId.productName,
              quantity: 0,
              revenue: 0,
              salesCount: 0
            });
          }
          const productData = productSalesMap.get(productId);
          productData.quantity += product.quantity;
          productData.revenue += product.totalPrice;
          productData.salesCount += 1;

          // Track category sales
          if (product.productId.category) {
            const categoryId = product.productId.category._id.toString();
            if (!categorySalesMap.has(categoryId)) {
              categorySalesMap.set(categoryId, {
                name: product.productId.category.name,
                quantity: 0,
                revenue: 0,
                salesCount: 0
              });
            }
            const categoryData = categorySalesMap.get(categoryId);
            categoryData.quantity += product.quantity;
            categoryData.revenue += product.totalPrice;
            categoryData.salesCount += 1;
          }
        });
      });

      // Convert to arrays and sort
      const topProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(product => ({
          ...product,
          salesPercentage: ((product.quantity / orders.length) * 100).toFixed(1)
        }));

      const topCategories = Array.from(categorySalesMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(category => ({
          ...category,
          salesPercentage: ((category.quantity / orders.length) * 100).toFixed(1)
        }));

      // Calculate totals
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalProducts = await Product.countDocuments({ isBlocked: false });
      const totalCustomers = await User.countDocuments({ isBlocked: false });

      console.log('Chart Data:', { labels, salesData }); 

      res.json({
        success: true,
        data: {
          labels,
          salesData,
          topProducts,
          topCategories,
          stats: {
            totalOrders,
            totalRevenue,
            totalProducts,
            totalCustomers
          }
        }
      });
    } catch (error) {
      console.error('Error in getDashboardData:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
        error: error.message
      });
    }
  },

  // Get Detailed Sales Report
  getSalesReport: async (req, res) => {
    try {
      let { startDate, endDate, page = 1, limit = 10 } = req.body;

      console.log("Raw date inputs:", { startDate, endDate });

      // Ensure we have valid dates
      startDate = new Date(startDate);
      endDate = new Date(endDate);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format provided",
        });
      }

      // Set time to start and end of day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Convert page and limit to numbers
      page = Number(page);
      limit = Number(limit);
      const skip = (page - 1) * limit;

      console.log("Querying orders between:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startDateFormatted: startDate.toLocaleString(),
        endDateFormatted: endDate.toLocaleString(),
        page,
        limit,
      });

      // Query orders within date range
      const orders = await Order.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $ne: "Cancelled" },
      })
        .populate("userId", "name email")
        .populate("products.productId", "productName price image1")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      console.log(`Found ${orders.length} orders for the selected date range`);

      // Get total count for pagination
      const totalCount = await Order.countDocuments({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $ne: "Cancelled" },
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;


      const allOrders = await Order.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
        status: { $ne: "Cancelled" },
      });

      // Default values in case calculation fails
      let totalOrders = 0;
      let totalRevenue = 0;
      let productsSold = 0;
      let averageOrderValue = 0;

      try {
        totalOrders = allOrders.length;
        totalRevenue = allOrders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );
        productsSold = allOrders.reduce(
          (sum, order) =>
            sum +
            order.products.reduce(
              (pSum, product) => pSum + product.quantity,
              0
            ),
          0
        );
        averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      } catch (calcError) {
        console.error("Error calculating summary statistics:", calcError);
        // Continue with default values
      }

      // Format orders for response
      const formattedOrders = orders.map((order) => ({
        orderId: order.orderId || order._id,
        date: order.createdAt,
        customerName: order.userId ? order.userId.name : "Guest User",
        products: order.products.reduce(
          (sum, product) => sum + product.quantity,
          0
        ),
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        status: order.status,
      }));

      console.log("Sending response with orders:", formattedOrders.length); 

      res.json({
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          productsSold,
          averageOrderValue,
          orders: formattedOrders,
          pagination: {
            currentPage: page,
            totalPages,
            hasNextPage,
            hasPrevPage,
            totalCount,
          },
        },
      });
    } catch (error) {
      console.error("Error in getSalesReport:", error);
      res.status(500).json({
        success: false,
        message: "Error generating sales report",
        error: error.message,
      });
    }
  },

  // Export Sales Report
  exportSalesReport: async (req, res) => {
    try {
      const { startDate, endDate, format } = req.query;

      const orders = await Order.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      })
        .populate("userId", "name email")
        .populate("products.productId", "productName price");

      if (format === "excel") {
        // Implement Excel export
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=sales-report-${startDate}-${endDate}.xlsx`
        );
        // Add Excel generation logic here
      } else if (format === "pdf") {
        // Implement PDF export
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=sales-report-${startDate}-${endDate}.pdf`
        );
        // Add PDF generation logic here
      } else {
        throw new Error("Invalid export format");
      }
    } catch (error) {
      console.error("Error in exportSalesReport:", error);
      res.status(500).json({
        success: false,
        message: "Error exporting sales report",
        error: error.message,
      });
    }
  },

  // Render the sales report page
  renderSalesReport: async (req, res) => {
    try {
      res.render("sales-report");
    } catch (error) {
      console.error("Error rendering sales report page:", error);
      res.status(500).send("Server error");
    }
  },

  // Render the main dashboard page
  renderDashboard: async (req, res) => {
    try {
      res.render("admin/dashboard");
    } catch (error) {
      console.error("Error rendering dashboard:", error);
      res.status(500).send("Server error");
    }
  },
};

module.exports = salesReportController;
