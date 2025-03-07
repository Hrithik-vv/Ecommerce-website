<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order History</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-8 text-center">Order History</h1>

        <!-- Order Card -->
        <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 mb-6">
            <div class="p-6 border-b border-gray-200">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div class="mb-2 md:mb-0">
                        <h2 class="text-xl font-semibold text-gray-800">
                            <i class="fas fa-box-open text-blue-500 mr-2"></i>
                            Order #11c1faf7
                        </h2>
                        <p class="text-gray-600 text-sm mt-1">
                            Placed on February 3, 2025
                        </p>
                    </div>
                    <span class="px-4 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
                        Pending
                    </span>
                </div>
            </div>

            <div class="p-6">
                <!-- Products List -->
                <div class="mb-6">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">Products</h3>
                    <div class="space-y-4">
                        <!-- Product Item -->
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center">
                                <div class="ml-4">
                                    <h4 class="font-medium text-gray-800">Product #6792931a</h4>
                                    <p class="text-gray-600 text-sm">Quantity: 1</p>
                                </div>
                            </div>
                            <span class="text-gray-800 font-medium">$499.00</span>
                        </div>

                        <!-- Product Item -->
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center">
                                <div class="ml-4">
                                    <h4 class="font-medium text-gray-800">Product #679298c3</h4>
                                    <p class="text-gray-600 text-sm">Quantity: 4</p>
                                </div>
                            </div>
                            <span class="text-gray-800 font-medium">$3,596.00</span>
                        </div>
                    </div>
                </div>

                <!-- Order Details -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="text-lg font-medium text-blue-800 mb-2">Payment Information</h3>
                        <p class="text-gray-700">Method: COD (Cash on Delivery)</p>
                        <p class="text-gray-700 font-medium mt-2">Total: $4,095.00</p>
                    </div>

                    <div class="bg-green-50 p-4 rounded-lg">
                        <h3 class="text-lg font-medium text-green-800 mb-2">Shipping Information</h3>
                        <p class="text-gray-700">Address: 67992ecb738afdc0149d6038</p>
                        <p class="text-gray-700 mt-2">Expected delivery: 3-5 business days</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add more order cards here -->
    </div>
</body>
</html>