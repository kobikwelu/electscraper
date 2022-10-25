
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const partyResultSchema = new mongoose.Schema({
    name: String,
    description: String,
    pollingUnitCode: String,
    logo: String,
    votes: Number,
    isAgentEndorsed: Boolean,
    electionDate: Date,
    resultSheetStateCode: Number,
    resultSheetLGACode: Number,
    resultSheetRegistrationArea: Number,
    resultSheetPollingUnitCode: Number,
    transactionTimeStamp:  { type: Date, default: Date.now }
});



const PartyResultSchema = db.model('PartyResult', partyResultSchema);

module.exports = PartyResultSchema;