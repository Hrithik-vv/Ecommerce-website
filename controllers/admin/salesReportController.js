const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');


const salesReportController = {
    // Get Dashboard Data
    getDashboardData: async (req, res) => {
        try {
            let { startDate, endDate } = req.body;
            
            // Ensure we have valid dates
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            
            // Set time to start and end of day
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            // Query orders within date range
            const orders = await Order.find({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                orderStatus: { $ne: 'Cancelled' }
            }).populate('userId', 'name email')
              .populate('products.productId', 'name price');

            // Calculate summary statistics
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const productsSold = orders.reduce((sum, order) => 
                sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0);
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Format orders for response
            const formattedOrders = orders.map(order => ({
                orderId: order._id,
                date: order.createdAt,
                customerName: order.userId ? order.userId.name : 'Guest User',
                products: order.products.length,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                status: order.orderStatus
            }));

            res.json({
                success: true,
                data: {
                    totalOrders,
                    totalRevenue,
                    productsSold,
                    averageOrderValue,
                    orders: formattedOrders
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
            let { startDate, endDate } = req.body;
            
            // Ensure we have valid dates
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            
            // Set time to start and end of day
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            console.log('Querying orders between:', { startDate, endDate }); // Debug log

            // Query orders within date range
            const orders = await Order.find({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                },
                orderStatus: { $ne: 'Cancelled' }
            }).populate('userId', 'name email')
              .populate('products.productId', 'name price');

            // Calculate summary statistics
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
            const productsSold = orders.reduce((sum, order) => 
                sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0);
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Format orders for response
            const formattedOrders = orders.map(order => ({
                orderId: order._id,
                date: order.createdAt,
                customerName: order.userId ? order.userId.name : 'Guest User',
                products: order.products.length,
                totalAmount: order.totalAmount,
                paymentMethod: order.paymentMethod,
                status: order.orderStatus
            }));

            console.log('Sending response with orders:', formattedOrders.length); // Debug log

            res.json({
                success: true,
                data: {
                    totalOrders,
                    totalRevenue,
                    productsSold,
                    averageOrderValue,
                    orders: formattedOrders
                }
            });

        } catch (error) {
            console.error('Error in getSalesReport:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating sales report',
                error: error.message
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
                    $lte: new Date(endDate)
                }
            }).populate('userId', 'name email')
              .populate('products.productId', 'name price');

            if (format === 'excel') {
                // Implement Excel export
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-${endDate}.xlsx`);
                // Add Excel generation logic here
            } else if (format === 'pdf') {
                // Implement PDF export
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDate}-${endDate}.pdf`);
                // Add PDF generation logic here
            } else {
                throw new Error('Invalid export format');
            }

        } catch (error) {
            console.error('Error in exportSalesReport:', error);
            res.status(500).json({
                success: false,
                message: 'Error exporting sales report',
                error: error.message
            });
        }
    }
};

module.exports = salesReportController;
