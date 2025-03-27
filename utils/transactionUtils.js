/**
 * Generates a unique transaction ID with a standardized format
 * Format: TXN + timestamp + random number (3 digits)
 * @returns {string} Unique transaction ID
 */
const generateTransactionId = () => {
    return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
};

module.exports = {
    generateTransactionId
}; 