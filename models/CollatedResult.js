const mongoose = require('mongoose');
const db = require('../dbConnect').get();

const collatedResultSchema = new mongoose.Schema({
    result_class: String,
    result_election_name: String,
    state_name: String,
    collated_result: {},
    transactionTimeStamp: Date
});

const CollatedResultSchema = db.model('CollatedResult', collatedResultSchema);


module.exports = CollatedResultSchema;