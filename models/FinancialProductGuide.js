
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const financialProductGuideSchema = new mongoose.Schema({
    business_name: String,
    business_website: String,
    business_about: String,
    business_product_offerings: String,
    inbound_sign_in_url: String,
    outbound_apple_store: String,
    outbound_google_play_store: String,
    logo: String
});



const FinancialProductGuide = db.model('FinancialProductGuide', financialProductGuideSchema);

module.exports = FinancialProductGuide;