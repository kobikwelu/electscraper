const ElectionResult = require("../models/ElectionResult");
const PartyResult = require("../models/PartyResult");
const PollingUnit = require("../models/PollingUnit");




exports.getWardsPerLGA = async (req, res) => {
    const {pollingUnit_Code} = req.body


    if (pollingUnit_Code) {
        try {

        } catch (error) {
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            })
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }

};





