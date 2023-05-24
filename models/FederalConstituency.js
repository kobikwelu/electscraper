const mongoose = require('mongoose');
const db = require('../dbConnect').get();


const federalConstituencySchema = new mongoose.Schema({
    state: String,
    federal_constituency_name: String,
    federal_constituency_code: String,
    composition_lga: String,
    collation_center_name: String,
    candidates: []
});


const FederalConstituencySchema = db.model('FederalConstituency', federalConstituencySchema);

module.exports = FederalConstituencySchema;