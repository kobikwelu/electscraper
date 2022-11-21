const mongoose = require('mongoose');
const db = require('../dbConnect').get();


const pollingUnitSchema = new mongoose.Schema({
    state: String,
    lga: String,
    ward: String,
    pollingUnit_id: Number,
    pollingUnit_name: String,
    pollingUnit_Code: String,
    remark: String
});


const PollingUnitSchema = db.model('PollingUnit', pollingUnitSchema);

pollingUnitSchema.query.byPollingUnitCode = function(pollingUnit_Code){
    return this.where({pollingUnit_Code})
}

module.exports = PollingUnitSchema;