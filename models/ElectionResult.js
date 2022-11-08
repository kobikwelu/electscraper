
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const electionResultSchema = new mongoose.Schema({
    pollingUnit_Country: String,
    pollingUnit_State: String,
    pollingUnit_LGA: String,
    pollingUnit_name: String,
    pollingUnit_Code: String,
    election_name: String,
    meta: {
        result_sheet_meta: {
            resultSheet_State_Code: Number,
            resultSheet_LGA_Code: Number,
            resultSheet_RegistrationArea_Code: Number,
            resultSheet_PollingUnit_Code: Number,
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
                partyId:{
                    type:mongoose.Schema.Types.ObjectId,
                    ref: 'PartyResult',
                    required: false
                }
            }
        ]
    },
    transactionTimeStamp:  { type: Date, default: Date.now }
});



const ElectionResultSchema = db.model('ElectionResult', electionResultSchema);

module.exports = ElectionResultSchema;