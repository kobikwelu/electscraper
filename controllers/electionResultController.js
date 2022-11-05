const ElectionResult = require('../models/ElectionResult');


exports.getElectionResult = async (req, res) => {
    const {
        pollingUnit_Country, pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
        pollingUnit_Code, election_name, meta
    } = req.body

    if (pollingUnit_State && pollingUnit_LGA && pollingUnit_name &&
        pollingUnit_Code && election_name){
        try{
            let electionResult = await ElectionResult.findOne({
                pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
                pollingUnit_Code, election_name
            })

            logger.info('item is not in the cache this time, so writing to cache')
            logger.info('writing item to cache')


            await redisClient.set(pollingUnit_Code, JSON.stringify(electionResult), {
                ex: 120,
                NX: true
            })
            logger.info('writing to cache successful')
            logger.info(`found and result ${electionResult._id}`)
            res.status(200);
            res.json({
                result: electionResult
            })
        }catch(error){
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            })
        }
    }else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }

};

exports.insertElectionResult = async (req, res) => {
    const {
        pollingUnit_Country, pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
        pollingUnit_Code, election_name, meta
    } = req.body
    const {result_sheet_meta, party_Votes} = meta
    const {
        resultSheet_State_Code, resultSheet_LGA_Code, resultSheet_RegistrationArea_Code,
        resultSheet_PollingUnit_Code, resultSheet_RegisteredVoters, resultSheet_IssuedBallotPapers,
        resultSheet_UnusedBallotPapers, resultSheet_SpoiledBallotPapers, resultSheet_RejectedBallotPapers,
        resultSheet_ValidVotes, resultSheet_totalUnusedBallotPapers
    } = result_sheet_meta


    if (pollingUnit_State && pollingUnit_LGA && pollingUnit_name &&
        pollingUnit_Code && election_name) {
        try {
            let count = await ElectionResult.countDocuments({
                pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
                pollingUnit_Code, election_name
            })
            if (count > 0) {
                logger.warn('Election has been created')
                res.status(200);
                res.json({
                    message: "This election result has been entered. " +
                        "If you need to modify it's content use the patch endpoint"
                })
            } else {
                let electionResult = await ElectionResult.create({
                    pollingUnit_Country,
                    pollingUnit_State,
                    pollingUnit_LGA,
                    pollingUnit_name,
                    pollingUnit_Code,
                    election_name,
                    meta
                })
                let eocR = await electionResult.save();
                logger.info('committing item to datastore')
                logger.info('writing item to cache')
                await redisClient.set(pollingUnit_Code, JSON.stringify(eocR), {
                    ex: 120,
                    NX: true
                })
                logger.info('cache write successful')
                res.status(200);
                res.json({
                    id: eocR._id
                })
            }
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

exports.updateElectionResult = async () => {

};

