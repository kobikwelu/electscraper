
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const electionNameSchema = new mongoose.Schema({
    election_name: String,
    election_group: String,
    election_description: String,
    election_demographics: String,
    election_classification: String
});



const ElectionNameSchema = db.model('ElectionName', electionNameSchema);

module.exports = ElectionNameSchema;