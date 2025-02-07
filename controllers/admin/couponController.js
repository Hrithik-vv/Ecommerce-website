const Coupon = require("../../models/couponSchema");
const mongoose = require("mongoose");

const loadCoupon = async (req, res) => {
  try {
    const findCoupons = await Coupon.find({});

    return res.render("coupons", { coupons: findCoupons });
  } catch (error) {
    return res.redirect("/pageerror");
  }
};

const createCoupon = async (req, res) => {
  try {
    const date = {
      couponName: req.body.couponName,
      startDate: new Date(req.body.startDate + "T00:00:00"),
      endDate: new Date(req.body.endDate + "T00:00:00"),
      offerPrice: parseInt(req.body.offerPrice),
      minimumPrice: parseInt(req.body.minimumPrice),
    };

    const newCoupon = new Coupon({
      name: date.couponName,
      createdOn: date.startDate,
      expireOn: date.endDate,
      offerPrice: date.offerPrice,
      minimumPrice: date.minimumPrice,
    });

    await newCoupon.save();
    return res.redirect("/admin/coupon");
  } catch (error) {
    res.redirect("/pageerror");
    console.log("create coupon error", error);
  }
};

const editCoupon = async (req, res) => {
  try {
    const id = req.query.id;
    const findCoupons = await Coupon.findOne({ _id: id });
    res.render("edit-Coupon", {
      findCoupons: findCoupons,
    });
  } catch (error) {
    res.redirect("/pageerror");
    console.log("edit coupon error", EvalError);
  }
};

const updateCoupon = async (req, res) => {
  try {
    const couponId = req.body.couponId; // Fixed typo
    const oid = new mongoose.Types.ObjectId(couponId);

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    const updateData = {
      name: req.body.couponName,
      createdOn: startDate,
      expireOn: endDate,
      offerPrice: parseInt(req.body.offerPrice),
      minimumPrice: parseInt(req.body.minimumPrice), // Fixed typo
    };

    const result = await Coupon.updateOne(
      { _id: oid },
      { $set: updateData },
      { new: true }
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        message: "No changes made or coupon not found",
      });
    }
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred",
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.query.id;
    await Coupon.deleteOne({ _id: id });
    res
      .status(200)
      .send({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleteting coupon", error);
    res.status(500).send({ succedd: false, message: "Faild to delete" });
  }
};

//Apply coupon
 const applycoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.session.user_id;

    const coupon = await Coupon.findOne({ 
      name: couponCode,
      isList: true,
      createdOn: { $lte: new Date() },
      expireOn: { $gte: new Date() }
    });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid coupon code' });
    }

    if (total < coupon.minimumPrice) {
      return res.json({ 
        success: false, 
        message: `Minimum purchase of ₹${coupon.minimumPrice} required`
      });
    }

    if (coupon.usedBy.includes(userId)) {
      return res.json({ 
        success: false, 
        message: 'This coupon has already been used' 
      });
    }

    const discount = Math.min(coupon.offerPrice, total);
    const newTotal = total - discount;

    return res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount,
      newTotal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  loadCoupon,
  createCoupon,
  editCoupon,
  updateCoupon,
  deleteCoupon,
  applycoupon
};
