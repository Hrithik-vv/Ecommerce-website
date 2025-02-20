const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

// Admin Coupon Controllers
const loadCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    return res.render("coupons", { coupons });
  } catch (error) {
    console.error("Load coupon error:", error);
    return res.redirect("/admin/error");
  }
};

const createCoupon = async (req, res) => {
  try {
    const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
    
    const newCoupon = new Coupon({
      name: couponName,
      createdOn: new Date(startDate + "T00:00:00"),
      expireOn: new Date(endDate + "T00:00:00"),
      offerPrice: parseInt(offerPrice),
      minimumPrice: parseInt(minimumPrice),
    });

    await newCoupon.save();
    return res.json({ success: true, message: "Coupon created successfully" });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.code === 11000 ? "Coupon code already exists" : "Failed to create coupon" 
    });
  }
};

// User Coupon Application
const applyCoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.session.user;

    if (!couponCode || !total) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing coupon code or total amount' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to apply coupon' 
      });
    }

    const coupon = await Coupon.findOne({ 
      name: new RegExp('^' + couponCode + '$', 'i'),
      isList: true,
      createdOn: { $lte: new Date() },
      expireOn: { $gte: new Date() },
      userId: { $ne: userId }
    });

    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid coupon or already used' 
      });
    }

    if (total < coupon.minimumPrice) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum purchase of ₹${coupon.minimumPrice} required` 
      });
    }

    const discount = Math.min(coupon.offerPrice, total);
    const newTotal = total - discount;

    // Store coupon in session
    req.session.appliedCoupon = {
      id: coupon._id,
      code: couponCode,
      discount
    };

    return res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount,
      newTotal
    });

  } catch (error) {
    console.error('Coupon application error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to apply coupon' 
    });
  }
};

module.exports = {
  loadCoupon,
  createCoupon,
  applyCoupon
};
