
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const financialProductGuideSchemaV2 = new mongoose.Schema({
    business_name: String,
    business_website: String,
    business_about: String,
    business_product_offerings: String,
    inbound_sign_in_url: String,
    outbound_apple_store: String,
    outbound_google_play_store: String,
    logo: String,
    group: {
        likes: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },
        signups: { type: Number, default: 0 }
    },
    self:{
        saves: { type: Number, default: 0 },
        signups: { type: Number, default: 0 }
    }
});



const FinancialProductGuideV2 = db.model('FinancialProductGuideV2', financialProductGuideSchemaV2);

module.exports = FinancialProductGuideV2;