const express = require("express");
const bodyParser = require("body-parser");
const useragent = require("express-useragent");
global.logger ??= require('pino')();
const RateLimit = require("express-rate-limit");
const device = require("express-device");
const config = require("./config");

const db = require("./dbConnect");
const redis = require("./redis");
const cron = require("node-cron");
//const authApi = require('./services/auth0api');
//const { checkDistricts } = require('./services/civicApi');
//const taskService = require('./services/taskService');

const { newslettersController, twitterController } = require("./controllers");
const app = express();

/**
 * Middleware
 */
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(device.capture());
//app.use(logger("combined"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(useragent.express());

app.enable("trust proxy");

const limiter = new RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 4500, // limit each IP to 100 requests per windowMs
    delayMs: 0, // disable delaying - full speed until the max limit is reached
});

// apply to all requests
//may need to ration access based on specific roles
app.use(limiter);

app.all("/*", (req, res, next) => {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET,PUT,POST,DELETE,PATCH,OPTIONS"
    );
    // Set custom headers for CORS
    res.header(
        "Access-Control-Allow-Headers",
        "Content-type,Accept,Authorization,X-Access-Token,X-Key"
    );
    if (req.method === "OPTIONS") {
        res.status(200).end();
    } else {
        next();
    }
});

app.use("/", require("./routes/index"));

// If no route is matched by now, it must be a 404
app.use((req, res, next) => {
    const err = new Error("No resource found");
    err.status = 404;
    next(err);
});
// Start the server
app.set("port", process.env.PORT || 4252);

const server = app.listen(app.get("port"), async () => {
    logger.info(
        "###########################################################################################"
    );
    logger.info(
        "###########################################################################################"
    );
    logger.info("*************************************************");
    logger.info("Setting up server server initialization process..");
    logger.info("*************************************************");
    logger.info(`Express server listening on port ${server.address().port}`);
    logger.info("*************************************************");
    logger.info("*************************************************");
    logger.info(`This is a  ${process.env.NODE_ENV} server`);
    logger.info("*************************************************");
    logger.info("*************************************************");
    logger.info("*************************************************");
    logger.info("Property of Kenneth Obikwelu");
    logger.info("*************************************************");
    logger.info("Attempting to connect to db .........");
    db.connect();
    logger.info("Attempting to connect to redis cache .........");
    global.redisClient = await redis.createClient()
    logger.info(
        "###########################################################################################"
    );
    logger.info(
        "###########################################################################################"
    );
});

/*
cron.schedule(`${config.cronTime}`, async () => {
    logger.info("running cron job");
    try {
        await newslettersController.getDailyNewsUpdates();
        await twitterController.broadcast()
    } catch (ex) {
        logger.info(ex);
    }
});
*/


function errorHandler(err, req, res, next) {
    res.status(500);
    res.render("error", { error: err });
}

module.exports = app;
