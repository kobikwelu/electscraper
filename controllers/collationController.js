const CollatedResult = require("../models/CollatedResult");

/**
 * This should return the latest result
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.getResult = async (req, res) => {
    const {
        result_election_name, result_data_point, result_class, transactionTimeStamp
    } = req.body

    if ( result_election_name && result_data_point && transactionTimeStamp && result_class) {
        let collatedResult
        //const queryTimestamp = new Date(transactionTimeStamp);
        try {
           collatedResult = await CollatedResult.find({
               result_election_name, result_data_point, result_class,  'transactionTimeStamp': { $gt: transactionTimeStamp }
            })

            if (collatedResult){
                logger.info('collated results found')
                let uniqueKey = `${result_class} ' ' ${result_data_point} ' '${transactionTimeStamp}`
                await redisClient.set(uniqueKey, JSON.stringify(collatedResult), {
                    ex: 120,
                    NX: true
                })
                logger.info('cache write successful')
                res.status(200);
                res.json({
                     collatedResult
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