const getCachedWardData = async (req, res, next) => {
    const {dataPoint} = req.body
    let cachedWardData
    try {
        const cacheResults = await redisClient.get(dataPoint);
        if (cacheResults) {
            cachedWardData = JSON.parse(cacheResults);
            logger.info(`pulling item from the ward cache`)
            res.status(200)
            res.send({
                result: cachedWardData
            })
        } else {
            logger.info('item not in ward cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in ward cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedWardData}