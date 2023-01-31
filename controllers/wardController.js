const ElectionResult = require("../models/PollingUnitResult");
const PartyResult = require("../models/PartyResult");
const PollingUnit = require("../models/PollingUnit");


exports.getPuInWard = async (req, res) => {
    const {dataPoint} = req.body


    if (dataPoint && (dataPoint.length === 8)) {
        try {
           let result = await getAllPUsInWard(dataPoint)
            if (result) {
                if (result.meta.count > 0){
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


const getAllPUsInWard = async (dataPoint) => {

    let result = {
        name: '',
        meta: {
            pUnits: '',
            count: ''
        }
    }
    let returnedDataPoint = await PollingUnit.find({
        "pollingUnit_Code": {
            "$regex": '^' + dataPoint
        }
    })
    if (returnedDataPoint) {
        result.ward = returnedDataPoint[0].ward;
        result.meta.pUnits = returnedDataPoint;
        result.meta.count = returnedDataPoint.length

        return result
    } else {
        return null
    }
}


