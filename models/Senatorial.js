const mongoose = require('mongoose');
const db = require('../dbConnect').get();


const senatorialSchema = new mongoose.Schema({
    state: String,
    senate_constituency_name: String,
    senatorial_district_code: String,
    composition_lga: String,
    collation_center: String,
    candidates: []
});


const SenatorialSchema = db.model('Senator', senatorialSchema);

module.exports = SenatorialSchema;