const ElectionResult = require("../models/PollingUnitResult");
const PartyResult = require("../models/PartyResult");
const PollingUnit = require("../models/PollingUnit");
let lodash = require('lodash')


exports.getWardInLGA = async (req, res) => {
    const {dataPoint} = req.body
    let result = {
        lga: '',
        meta: ''
    }


    if (dataPoint && (dataPoint.length === 5)) {
        try {
            let returnedDataPoint = await PollingUnit.find({
                "pollingUnit_Code": {
                    "$regex": '^' + dataPoint
                }
            })
            if (returnedDataPoint) {
                let groupedWards = lodash.groupBy(returnedDataPoint, 'ward')
                result.lga = returnedDataPoint[0].lga;
                result.meta = groupedWards
                result.count = lodash.size(groupedWards)

                if (result.count > 0) {
                    logger.info('item is not in the cache this time, so writing to cache')
                    await redisClient.set(dataPoint, JSON.stringify(result), {
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





