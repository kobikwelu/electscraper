const getCachedResults = async (req, res, next) => {
    const {
         result_data_point, result_class, transactionTimeStamp
    } = req.body

    let cachedResult
    let uniqueKey = `${result_class} ' ' ${result_data_point} ' '${transactionTimeStamp}`
    try {
        const cacheResult = await redisClient.get(uniqueKey);
        if (cacheResult) {
            cachedResult = JSON.parse(cacheResult);
            logger.info(`pulling item from the result cache`)
            res.status(200)
            res.send({
                result: cachedResult
            })
        } else {
            logger.info('results not found in results cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in result cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedResults}