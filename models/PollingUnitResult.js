const mongoose = require('mongoose');
const db = require('../dbConnect').get();

const pollingUnitResultSchema = new mongoose.Schema({
    pollingUnit_Country: String,
    pollingUnit_State: String,
    pollingUnit_LGA: String,
    pollingUnit_ward: String,
    pollingUnit_name: String,
    pollingUnit_Code: String,
    election_name: String,
    meta: {
        result_sheet_meta: {
            resultSheet_State_Code: String,
            resultSheet_LGA_Code: String,
            resultSheet_RegistrationArea_Code: String,
            resultSheet_PollingUnit_Code: String,
            resultSheet_RegisteredVoters: Number,
            resultSheet_IssuedBallotPapers: Number,
            resultSheet_UnusedBallotPapers: Number,
            resultSheet_SpoiledBallotPapers: Number,
            resultSheet_RejectedBallotPapers: Number,
            resultSheet_ValidVotes: Number,
            resultSheet_totalUnusedBallotPapers: Number,
        },
        party_Votes :[
            {
                partyName: String,
                partyAcronym: String,
                votes: Number
            }
        ]
    },
    transactionTimeStamp:  { type: Date, default: Date.now }
});


const PollingUnitResultSchema = db.model('PollingUnitResult', pollingUnitResultSchema);


module.exports = PollingUnitResultSchema;