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
                lazyConnect: true,
                showFriendlyErrorStack: true,
                enableOfflineQueue: true,
                maxRetriesPerRequest: null, // Null means that it will retry forever
                retry_strategy: function (options) {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('The server refused the connection');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                },
                socket: {
                    tls: false,
                    rejectUnauthorized: false,
                    keepAlive: 10000,
                    connectTimeoutMS: 50000,
                    reconnectStrategy: (retries => {
                        Math.min(retries * 50, 500)
                    })
                }
            });
            logger.info('***** REMOTE REDIS client created .....')


        } else {
            redisClient = await redis.createClient({
                retry_strategy: function (options) {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        return new Error('The server refused the connection');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                },
            });
            logger.info('***** LOCAL REDIS client created .....')

            redisClient.on("error", (error) => {
                logger.error('***** Not connected to REDIS .....')
                logger.error(`Error : ${error}`)
            });
        }
        await redisClient.connect()
        logger.info('***** Connected to redis client .....')
        if (redisClient) {
            logger.info('***** REDIS connection verified .....')
            state.connected = true;
        }


        redisClient.on("disconnected", () => {
            logger.warn('Redis default connection is disconnected')
        });

        process.on('SIGINT', function () {
            logger.info('Redis default connection is disconnected due to application termination')
            process.exit(0);
        });

        redisClient.on('error', async (error) => {
            // Log the error
            logger.error(`Error : ${error}`)
            if (!state.connected) {
                // Attempt to reconnect to the Redis instance
                await redisClient.connect();
            }
        });

        return redisClient
    } catch (error) {
        logger.error(`REDIS Error : ${error}`)
    }
}
