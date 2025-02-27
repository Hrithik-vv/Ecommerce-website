const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // Ensures only one wallet per user
    },
    
    balance: {
        type: Number,
        default: 0
    },
    transactions: [{
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
    }]
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
