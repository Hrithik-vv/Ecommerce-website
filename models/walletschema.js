const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    walletId: {
        type: String,
        default: function() {
            return this.userId ? this.userId.toString() : null;
        },
        unique: true,
        sparse: true
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, 'Balance cannot be negative']
    },
    transactions: [
        {
            transactionId: {
                type: String,
                required: true,
                default: function() {
                    return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
                }
            },
            amount: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['credit', 'debit'],
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            description: {
                type: String,
                required: true
            }
        }
    ]
});

const Wallets = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);

module.exports = Wallets;
