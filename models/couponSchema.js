const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true 
    },
    expireOn: {
        type: Date,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true,
        min: 0
    },
    minimumPrice: {
        type: Number,
        required: true,
        min: 0
    },
    isList: {
        type: Boolean,
        default: true
    },
    usedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    timestamps: true
});

// Add index for faster queries
couponSchema.index({ name: 1, isList: 1, createdOn: 1, expireOn: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;