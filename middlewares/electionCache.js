const getCachedElectionData = async (req, res, next) => {
    const {pollingUnit_Code} = req.body
    let cachedElectionData
    try {
        const cacheResults = await redisClient.get(pollingUnit_Code);
        if (cacheResults) {
            cachedElectionData = JSON.parse(cacheResults);
            logger.info(`pulling ${cachedElectionData._id} from the election cache`)
            res.status(200)
            res.send({
                result: cachedElectionData
            })
        } else {
            logger.info('item not in election bucket cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in election cache bucket. Skipping')
        next();
    }
}

const preInsertCacheCheck = async (req, res, next) => {
    const {pollingUnit_Code} = req.body
    let cachedElectionData
    try {
        const cacheResults = await redisClient.get(pollingUnit_Code);
        if (cacheResults) {
            cachedElectionData = JSON.parse(cacheResults);
            logger.info(`cannot proceed with new write to data store ${cachedElectionData._id} already exists`)
            res.status(200);
            res.json({
                message: "This election result has been entered. " +
                    "If you need to modify it's content use the patch endpoint"
            })
        } else {
            logger.info('item not in cache. proceeding to write activity')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in cache bucket. Skipping')
        next();
    }
}

const getCachedElectionNames = async (req, res, next) => {
    const {election_group} = req.body
    let cachedElectionData
    try {
        const cacheResults = await redisClient.get(election_group);
        if (cacheResults) {
            cachedElectionData = JSON.parse(cacheResults);
            logger.info(`pulling data from the election cache`)
            res.status(200)
            res.send({
                result: cachedElectionData
            })
        } else {
            logger.info('item not in election bucket cache')
            next();
        }
    } catch (error) {
        logger.warn(error)
        logger.warn('error in election cache bucket. Skipping')
        next();
    }
}


module.exports = {getCachedElectionData, preInsertCacheCheck, getCachedElectionNames}