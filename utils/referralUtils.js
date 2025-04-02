/**
 * Utility functions for the referral system
 */

/**
 * Generates a unique referral code
 * Format: REF + first 3 letters of name (uppercase) + random number (4 digits)
 * @param {string} name - User's name
 * @returns {string} Unique referral code
 */
const generateReferralCode = (name) => {
    const namePrefix = name && name.length >= 3 
        ? name.substring(0, 3).toUpperCase() 
        : 'USR';
    
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return `REF${namePrefix}${randomNum}`;
};

/**
 * Generate a shareable referral link
 * @param {string} baseUrl - Base URL of the website
 * @param {string} referralCode - User's referral code
 * @returns {string} Complete referral link
 */
const generateReferralLink = (baseUrl, referralCode) => {
    return `${baseUrl}/signup?ref=${referralCode}`;
};

module.exports = {
    generateReferralCode,
    generateReferralLink
}; 