const redis = require("redis");
const config = require('../config');

const state = {
    connected: false
}

let redisClient;

const getConnectionString = () => {
    return config.redis.connectionString;
};


exports.createClient = async () => {
    try {
        if (state.connected) {
            return;
        }
        if (config.redis.connectionString) {
            logger.info(`connection string ${getConnectionString()}`)
            redisClient = await redis.createClient({
                url: getConnectionString(),
                socket: {
                    tls: true,
                    rejectUnauthorized: false
                }
            });
            logger.info('***** REMOTE REDIS client created .....')


        } else {
            redisClient = await redis.createClient({});
            logger.info('***** LOCAL REDIS client created .....')

            redisClient.on("error", (error) => {
                logger.error('***** Not connected to REDIS .....')
                logger.error(`Error : ${error}`)
            });
        }

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
    } catch (error) {
        logger.error(`Error : ${error}`)
    }
}

