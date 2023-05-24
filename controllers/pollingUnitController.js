
const PollingUnit = require("../models/PollingUnit");

exports.getDataPoint = async (req, res) => {
    const {dataPoint} = req.body
    let result = {
        pUnits: '',
        count: ''
    }
    if (dataPoint) {
        try {
            let returnedDataPoint = await PollingUnit.find({
                "pollingUnit_Code": {
                    "$regex": '^' + dataPoint
                }
            })

            if (returnedDataPoint){
                result.pUnits = returnedDataPoint;
                result.count = returnedDataPoint.length
                if (result.count > 0){
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
            message: "Missing required values"
        })
    }

};


