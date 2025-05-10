const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');

const chartController = {
    getChartData: async (req, res) => {
        try {
            const { period } = req.query;
            const currentDate = new Date();
            let startDate;
            let dateFormat;
            let groupByFormat;

            // Set date range based on period
            switch (period) {
                case 'daily':
                    startDate = new Date(currentDate);
                    startDate.setDate(currentDate.getDate() - 7); // Last 7 days
                    dateFormat = { day: '2-digit', month: 'short' };
                    groupByFormat = '%Y-%m-%d';
                    break;
                case 'monthly':
                default:
                    startDate = new Date(currentDate);
                    startDate.setMonth(currentDate.getMonth() - 12); // Last 12 months
                    dateFormat = { month: 'short', year: 'numeric' };
                    groupByFormat = '%Y-%m';
                    break;
                case 'yearly':
                    startDate = new Date(currentDate);
                    startDate.setFullYear(currentDate.getFullYear() - 5); // Last 5 years
                    dateFormat = { year: 'numeric' };
                    groupByFormat = '%Y';
                    break;
            }

            // Aggregate orders data with more details
            const orders = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        status: { $ne: "Cancelled" }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
                            paymentMethod: "$paymentMethod"
                        },
                        totalSales: { $sum: "$totalAmount" },
                        orderCount: { $sum: 1 },
                        productCount: {
                            $sum: { $size: "$products" }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id.date",
                        sales: {
                            $push: {
                                method: "$_id.paymentMethod",
                                amount: "$totalSales",
                                orders: "$orderCount",
                                products: "$productCount"
                            }
                        },
                        totalAmount: { $sum: "$totalSales" }
                    }
                },
                {
                    $sort: { "_id": 1 }
                }
            ]);

            // Process the data for the chart
            const categories = [];
            const totalSeries = [];
            const codSeries = [];
            const onlineSeries = [];
            const orderCountSeries = [];

            orders.forEach(order => {
                const date = new Date(order._id);
                categories.push(date.toLocaleDateString('en-US', dateFormat));
                totalSeries.push(order.totalAmount);

                let codAmount = 0;
                let onlineAmount = 0;
                let orderCount = 0;

                order.sales.forEach(sale => {
                    if (sale.method === 'COD') {
                        codAmount = sale.amount;
                    } else if (sale.method === 'Razorpay') {
                        onlineAmount = sale.amount;
                    }
                    orderCount += sale.orders;
                });

                codSeries.push(codAmount);
                onlineSeries.push(onlineAmount);
                orderCountSeries.push(orderCount);
            });

            // Get top products, categories, and brands
            const topProducts = await Product.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: '_id',
                        foreignField: 'products.productId',
                        as: 'orders'
                    }
                },
                {
                    $project: {
                        name: '$productName',
                        sales: {
                            $sum: {
                                $map: {
                                    input: '$orders',
                                    as: 'order',
                                    in: {
                                        $cond: [
                                            { $ne: ['$$order.status', 'Cancelled'] },
                                            '$$order.totalAmount',
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            const topCategories = await Category.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'category',
                        as: 'products'
                    }
                },
                {
                    $unwind: {
                        path: '$products',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $lookup: {
                        from: 'orders',
                        pipeline: [
                            {
                                $match: {
                                    status: { $ne: 'Cancelled' }
                                }
                            },
                            {
                                $unwind: '$products'
                            }
                        ],
                        as: 'orders'
                    }
                },
                {
                    $unwind: {
                        path: '$orders',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        'orders.products.productId': { $eq: '$products._id' }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$categoryName' },
                        sales: { $sum: '$orders.totalAmount' }
                    }
                },
                {
                    $match: {
                        sales: { $gt: 0 }
                    }
                },
                {
                    $sort: { sales: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            const topBrands = await Brand.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'brand',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        name: '$brandName',
                        sales: {
                            $sum: {
                                $map: {
                                    input: '$products',
                                    as: 'product',
                                    in: {
                                        $sum: {
                                            $map: {
                                                input: '$$product.orders',
                                                as: 'order',
                                                in: {
                                                    $cond: [
                                                        { $ne: ['$$order.status', 'Cancelled'] },
                                                        '$$order.totalAmount',
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            // Get total products count
            const totalProducts = await Product.countDocuments();

            // Get total categories count
            const totalCategories = await Category.countDocuments();

            res.json({
                success: true,
                categories,
                series: [
                    {
                        name: 'Total Sales',
                        data: totalSeries,
                        type: 'line'
                    },
                    {
                        name: 'COD Sales',
                        data: codSeries,
                        type: 'column'
                    },
                    {
                        name: 'Online Sales',
                        data: onlineSeries,
                        type: 'column'
                    },
                    {
                        name: 'Order Count',
                        data: orderCountSeries,
                        type: 'line'
                    }
                ],
                topProducts,
                topCategories,
                topBrands,
                totalProducts,
                totalCategories
            });

        } catch (error) {
            console.error('Error fetching chart data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching chart data',
                error: error.message
            });
        }
    },

    // Render dashboard with initial data
    renderDashboard: async (req, res) => {
        try {
            // Get current month's start and end dates
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            // Get monthly sales statistics
            const monthlyStats = await Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfMonth,
                            $lte: endOfMonth
                        },
                        status: { $ne: "Cancelled" }
                    }
                },
                {
                    $group: {
                        _id: "$paymentMethod",
                        total: { $sum: "$totalAmount" }
                    }
                }
            ]);

            // Calculate totals
            let totalMonthlySales = 0;
            let codSales = 0;
            let onlineSales = 0;

            monthlyStats.forEach(stat => {
                totalMonthlySales += stat.total;
                if (stat._id === 'COD') {
                    codSales = stat.total;
                } else if (stat._id === 'Razorpay') {
                    onlineSales = stat.total;
                }
            });

            // Get top products
            const topProducts = await Product.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: '_id',
                        foreignField: 'products.productId',
                        as: 'orders'
                    }
                },
                {
                    $project: {
                        name: '$productName',
                        sales: {
                            $sum: {
                                $map: {
                                    input: '$orders',
                                    as: 'order',
                                    in: {
                                        $cond: [
                                            { $ne: ['$$order.status', 'Cancelled'] },
                                            '$$order.totalAmount',
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            // Get top categories
            const topCategories = await Category.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'category',
                        as: 'products'
                    }
                },
                {
                    $unwind: {
                        path: '$products',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $lookup: {
                        from: 'orders',
                        pipeline: [
                            {
                                $match: {
                                    status: { $ne: 'Cancelled' }
                                }
                            },
                            {
                                $unwind: '$products'
                            }
                        ],
                        as: 'orders'
                    }
                },
                {
                    $unwind: {
                        path: '$orders',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        'orders.products.productId': { $eq: '$products._id' }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$categoryName' },
                        sales: { $sum: '$orders.totalAmount' }
                    }
                },
                {
                    $match: {
                        sales: { $gt: 0 }
                    }
                },
                {
                    $sort: { sales: -1 }
                },
                {
                    $limit: 10
                }
            ]);

            // Get top brands
            const topBrands = await Brand.aggregate([
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'brand',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        name: '$brandName',
                        sales: {
                            $sum: {
                                $map: {
                                    input: '$products',
                                    as: 'product',
                                    in: {
                                        $sum: {
                                            $map: {
                                                input: '$$product.orders',
                                                as: 'order',
                                                in: {
                                                    $cond: [
                                                        { $ne: ['$$order.status', 'Cancelled'] },
                                                        '$$order.totalAmount',
                                                        0
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            // Get total products count
            const totalProducts = await Product.countDocuments();

            // Get total categories count
            const totalCategories = await Category.countDocuments();

            res.render('dashboard', {
                topProducts,
                topCategories,
                topBrands,
                totalMonthlySales,
                codSales,
                onlineSales,
                totalProducts,
                totalCategories
            });

        } catch (error) {
            console.error('Error rendering dashboard:', error);
            res.status(500).send('Error loading dashboard');
        }
    }
};

module.exports = chartController; 