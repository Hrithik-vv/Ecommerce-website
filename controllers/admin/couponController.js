const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

// Admin Coupon Controllers
const loadCoupon = async (req, res) => {
  try {
    const itemsPerPage = 5;
    const currentPage = parseInt(req.query.page) || 1;
    const totalCoupons = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCoupons / itemsPerPage);

    const coupons = await Coupon.find({})
      .skip((currentPage - 1) * itemsPerPage)
      .limit(itemsPerPage);

    res.render("coupons", {
      coupons,
      currentPage,
      totalPages,
      itemsPerPage
    });
  } catch (error) {
    console.error("Error loading coupons:", error);
    res.redirect("/admin/error");
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
    return res.redirect('/admin/coupon')
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

const deleteCoupon = async (req, res) => {
  const { id } = req.body;

  try {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Coupon not found' 
      });
    }

    await Coupon.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Coupon deletion error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete coupon' 
    });
  }
};

const loadeditCoupon = async (req,res)=>{
  try {
    const findCoupons = await Coupon.findById(req.query.id);
    
    
    res.render('edit-coupon',{findCoupons})
  } catch (error) {
    console.log(error);
    
  }
}


const updateCoupon = async (req, res) => {
  const { couponId, couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;

  try {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ 
        success: false, 
        message: 'Coupon not found' 
      });
    }

    coupon.name = couponName;
    coupon.startDate = startDate;
    coupon.endDate = endDate;
    coupon.offerPrice = offerPrice;
    coupon.minimumPrice = minimumPrice;

    await coupon.save();

    return res.json({
      success: true,
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    console.error('Coupon update error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update coupon' 
    });
  }
};

module.exports = {
  updateCoupon,
  deleteCoupon,
  loadCoupon,
  createCoupon,
  applyCoupon,
  loadeditCoupon
};
