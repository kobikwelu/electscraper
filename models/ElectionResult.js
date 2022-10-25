
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const electionResultSchema = new mongoose.Schema({
    pollingUnitCode: String,
    pollingUnitName: String,
    pollingUnitDescription: String,
    election: String,
    meta: [
        {
            partyId:{
                type:mongoose.Schema.Types.ObjectId,
                ref: 'Party',
                required: false
            }
        }
    ],
    transactionTimeStamp:  { type: Date, default: Date.now }
});



const ElectionResultSchema = db.model('ElectionResult', electionResultSchema);

module.exports = ElectionResultSchema;