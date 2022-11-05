const redis = require("redis");

const state = {
    connected: false
}

let redisClient;


exports.createClient = async () => {
    if (state.connected) {
        return;
    }
    redisClient = await redis.createClient({});
    logger.info('***** client created .....')

    redisClient.on("error", (error) => {
        logger.error('***** Not connected to REDIS .....')
        logger.error(`Error : ${error}`)
    });

    await redisClient.connect()
    logger.info('***** Connected to redis client .....')
    if (redisClient) {
        logger.info('***** connection verified .....')
        state.connected = true;
    }


    redisClient.on("disconnected", () => {
        logger.warn('Redis default connection is disconnected')
    });

    process.on('SIGINT', function () {
        logger.info('Redis default connection is disconnected due to application termination')
        process.exit(0);
    });
    return redisClient
}

