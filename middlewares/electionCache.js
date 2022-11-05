const getCachedElectionData = async (req, res, next) => {
    const {pollingUnit_Code} = req.body
    let cachedElectionData
    try {
        const cacheResults = await redisClient.get(pollingUnit_Code);
        if (cacheResults) {
            cachedElectionData = JSON.parse(cacheResults);
            logger.info(`pulling ${cachedElectionData._id} from the cache`)
            res.status(200)
            res.send({
                result: cachedElectionData
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

module.exports = {getCachedElectionData}