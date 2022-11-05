/**
 * Created by maryobikwelu on 2/28/20
 */


const mongoose = require('mongoose');
const config = require('../config');

const state = {
    connected: false,
};

const getConnectionString =  () => {
    if (config.mongo.connectionString) {
        return config.mongo.connectionString;
    }
    return `mongodb://${config.mongo.host}:${config.mongo.port}/${config.mongo.database}`;
};

exports.connect = () => {
    if (state.connected) {
        return;
    }

     mongoose.connect(getConnectionString(), config.mongo.options);

    mongoose.connection.on('error', (error) => {
        logger.warn('***** Not connected to database .....')
        logger.error(error)
        process.exit(1);
    });

    mongoose.connection.once('open', () => {
        logger.info('***** Connected to Mongo database .....')
        state.connected = true;
    });

    mongoose.connection.on('disconnected', ()=>{
        logger.error('Mongoose default connection is disconnected')
    });

    process.on('SIGINT', function(){
        mongoose.connection.close(function(){
            logger.info('Mongoose default connection is disconnected due to application termination')
            process.exit(0);
        });
    });
};

exports.get = () => mongoose.connection;
