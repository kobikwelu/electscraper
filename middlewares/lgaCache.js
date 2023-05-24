const getCachedLGAData = async (req, res, next) => {
    const {dataPoint} = req.body
    let cachedLGAData
    try {
        const cacheResults = await redisClient.get(dataPoint);
        if (cacheResults) {
            cachedLGAData = JSON.parse(cacheResults);
            logger.info(`pulling item from the lga cache`)
            res.status(200)
            res.send({
                result: cachedLGAData
            })
        } else {
            logger.info('item not in lga cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in lgacache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedLGAData}