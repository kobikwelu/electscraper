const getCachedStateData = async (req, res, next) => {
    const {state} = req.body
    let cachedStateData
    try {
        const cacheResults = await redisClient.get(state);
        if (cacheResults) {
            cachedStateData = JSON.parse(cacheResults);
            logger.info(`pulling item from the state cache`)
            res.status(200)
            res.send({
                result: cachedStateData
            })
        } else {
            logger.info('item not in state cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in state cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedStateData}