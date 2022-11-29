const getCachedDistrict = async (req, res, next) => {
    const {state} = req.body
    let cachedPollingUnitData
    try {
        const cacheResults = await redisClient.get(state);
        if (cacheResults) {
            cachedPollingUnitData = JSON.parse(cacheResults);
            logger.info(`pulling item from the district cache`)
            res.status(200)
            res.send({
                result: cachedPollingUnitData
            })
        } else {
            logger.info('item not in district cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in district cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedDistrict}