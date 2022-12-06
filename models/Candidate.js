
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const candidateSchema = new mongoose.Schema({
    country: String,
    state: String,
    constituency: String,
    party: String,
    position: String,
    candidate_name: String,
    age: Number,
    gender: String,
    qualifications: String,
    remarks: String,
    election_name: String
});



const CandidateSchema = db.model('Candidate', candidateSchema);

module.exports = CandidateSchema;