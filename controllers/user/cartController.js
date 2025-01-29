const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");

const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Product ID and quantity are required",
        });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const productIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex > -1) {
      cart.items[productIndex].quantity += qty;
      cart.items[productIndex].totalPrice =
        cart.items[productIndex].quantity * product.price;
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        productPrice: product.price,
        totalPrice: product.price * qty,
      });
    }

    await cart.save();
    res.json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while adding the product to the cart",
      });
  }
};

// Export functions correctly
module.exports = { addToCart };

const viewCart = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming user is authenticated and user info is available in req.user

    // Check if the cart exists
    let cart = await Cart.findOne({ userId }).populate(
      "items.productId",
      "productName price"
    );

    // If the cart doesn't exist, create an empty one
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
      });
      await cart.save(); // Save the newly created cart
    }

    // Send cart items to the view
    res.render("shopping-cart", { cartItems: cart.items });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the cart",
    });
  }
};

//checkOut
const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/shopping-cart");
    }

    res.render("checkout", { cartItems: cart.items, user: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading checkout page");
  }
};

const processCheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        let cart;
        
        if (req.body.productId) {
            const product = await Product.findById(req.body.productId);
            if (!product) return res.status(404).json({ message: "Product not found" });

            cart = { items: [{ productId: product._id, quantity: 1, totalPrice: product.price }] };
        } else {
            cart = await Cart.findOne({ userId }).populate("items.productId");
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ success: false, message: "Your cart is empty" });
            }
        }

        const newOrder = new Order({
            userId,
            items: cart.items,
            totalAmount: cart.items.reduce((acc, item) => acc + item.totalPrice, 0),
            status: "Pending"
        });

        await newOrder.save();
        if (!req.body.productId) await Cart.deleteOne({ userId });

        res.json({ success: true, message: "Order placed successfully", orderId: newOrder._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Checkout failed" });
    }
};

module.exports = {
  addToCart,
  viewCart,
  loadCheckoutPage,
  processCheckout,
};
