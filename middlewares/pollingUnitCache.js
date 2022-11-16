const getCachedDataPoint = async (req, res, next) => {
    const {dataPoint} = req.body
    let cachedPollingUnitData
    try {
        const cacheResults = await redisClient.get(dataPoint);
        if (cacheResults) {
            cachedPollingUnitData = JSON.parse(cacheResults);
            logger.info(`pulling item from the cache`)
            res.status(200)
            res.send({
                result: cachedPollingUnitData
            })
        } else {
            logger.info('item not in cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedDataPoint}