/**
 * Generates a unique order ID with a standardized format
 * Format: ORD + timestamp + random number (3 digits)
 * @returns {string} Unique order ID
 */
const generateOrderId = () => {
    return 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
};

module.exports = {
    generateOrderId
}; 