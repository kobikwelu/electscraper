const ElectionResult = require("../models/ElectionResult");
const PartyResult = require("../models/PartyResult");
const PollingUnit = require("../models/PollingUnit");
let lodash = require('lodash')


exports.getLGAInState = async (req, res) => {
    const {state} = req.body
    let result = {
        state: '',
        meta: ''
    }


    if (state) {
        try {
            let returnedDataPoint = await PollingUnit.find({
               state: state
            })
            if (returnedDataPoint){
                let groupedLGA = lodash.groupBy(returnedDataPoint, 'lga')
                result.state = returnedDataPoint[0].state;
                result.meta = groupedLGA
                result.count = lodash.size(groupedLGA)

                if (result.count > 0) {
                    logger.info('item is not in the cache this time, so writing to cache')
                    await redisClient.set(state, JSON.stringify(result), {
                        ex: 120,
                        NX: true
                    })
                }
                res.status(200);
                res.json({
                    result
                })
            } else {
                res.status(200);
                res.json({
                    result: []
                })
            }
        } catch (error) {
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            })
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values or check that you are passing the " +
                "correct datapoint char length"
        })
    }

};





