const addProduct = async (req, res) => {
  console.log('duifhdfkjdsdasdsaddsdsdssdsd');
try {
  const {
    productName,
    description,
    salePrice,
    productOffer,
    color,
    category,
    variants
  } = req.body;
  console.log('duifhdfkjdsdasdsaddsdsdssdsd');
  console.log(req.body);
  console.log('duifhdfkjdsdsdsdsdsdsdsdsdsds');
  // Create new product
  const product = new Product({
    productName,
    description,
    salePrice: parseFloat(salePrice), // Ensure salePrice is a number
    productOffer: parseInt(productOffer),
    color,
    category,
    variants: JSON.parse(variants || '[]'), // Parse variants or use empty array
    status: 'Available'
  });

  // Handle image uploads if present
  if (req.files) {
    // Your existing image handling code
  }

  await product.save();
  res.redirect('/admin/products');
} catch (error) {
  console.error('Error adding product:', error);
  res.status(500).json({ error: error.message });
}
}; 