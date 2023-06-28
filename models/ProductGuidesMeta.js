const mongoose = require('mongoose');
const db = require('../dbConnect').get();

const productGuidesMetaSchema = new mongoose.Schema({
    business_name: String,
    business_website: String,
    investors: String,
    growth: String,
    countries_of_operations: String,
    company_rating: String,
    developer_docs: String,
    leadership_team: String,
    major_services_offered: String,
    address: String
});

const ProductGuidesMetaSchema = db.model('productGuidesMetas', productGuidesMetaSchema);


module.exports = ProductGuidesMetaSchema;