const ElectionResult = require('../models/ElectionResult');
const PartyResult = require('../models/PartyResult');


exports.getElectionResult = async (req, res) => {
    const {
        pollingUnit_Country, pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
        pollingUnit_Code, election_name
    } = req.body

    if (pollingUnit_State && pollingUnit_LGA && pollingUnit_name &&
        pollingUnit_Code && election_name) {
        let electionResult
        try {
             electionResult = await ElectionResult.findOne({
                pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
                pollingUnit_Code, election_name
            })

            if (electionResult){
                logger.info('item is not in the cache this time, so writing to cache')

                await redisClient.set(pollingUnit_Code, JSON.stringify(electionResult), {
                    ex: 120,
                    NX: true
                })

                logger.info(`found and result ${electionResult._id}`)
                res.status(200);
                res.json({
                    result: electionResult
                })
            } else {
                res.status(200);
                res.json({
                    result: []
                })
            }
        } catch (error) {
            logger.error(error)
            if (error.message.includes( 'Cannot read property')) {
                logger.warn('caching process failed')
                res.status(200);
                res.json({
                    result: electionResult
                })
            } else {
                res.status(500);
                res.json({
                    message: "something went wrong"
                })
            }
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }

};

exports.insertElectionResult = async (req, res) => {
    let eocR
    const {
        pollingUnit_Country, pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
        pollingUnit_Code, election_name, meta
    } = req.body

    if (pollingUnit_State && pollingUnit_LGA && pollingUnit_name &&
        pollingUnit_Code && election_name) {
        try {
            let count = await ElectionResult.countDocuments({
                pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
                pollingUnit_Code, election_name
            })
            if (count > 0) {
                logger.warn('Election instance has already been created')
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
                    meta: {
                        result_sheet_meta: {
                            resultSheet_State_Code: "",
                            resultSheet_LGA_Code: "",
                            resultSheet_RegistrationArea_Code: "",
                            resultSheet_PollingUnit_Code: "",
                            resultSheet_RegisteredVoters: "",
                            resultSheet_IssuedBallotPapers: "",
                            resultSheet_UnusedBallotPapers: "",
                            resultSheet_SpoiledBallotPapers: "",
                            resultSheet_RejectedBallotPapers: "",
                            resultSheet_ValidVotes: "",
                            resultSheet_totalUnusedBallotPapers: ""
                        },
                        party_Votes: []
                    }
                })
                 eocR = await electionResult.save();
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
            if (error.message.includes('Cannot read properties of undefined')) {
                logger.warn('item was not saved to cache')
                res.status(200);
                res.json({
                    id: eocR._id
                })
            } else {
                res.status(500);
                res.json({
                    message: "something went wrong"
                })
            }
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }
};

exports.updateElectionResult = async (req, res) => {
    let partyVotesId = []
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

    if (pollingUnit_Code && election_name && resultSheet_State_Code && resultSheet_LGA_Code && resultSheet_RegistrationArea_Code
        && resultSheet_PollingUnit_Code && resultSheet_RegisteredVoters && resultSheet_IssuedBallotPapers && resultSheet_UnusedBallotPapers
        && resultSheet_SpoiledBallotPapers && resultSheet_RejectedBallotPapers && resultSheet_ValidVotes && resultSheet_totalUnusedBallotPapers
        && (party_Votes.length > 1)) {

        try {
            logger.info('checking if election Result instance exists')
            let staleElectionResult = await ElectionResult.findOne({
                pollingUnit_State, pollingUnit_LGA, pollingUnit_name,
                pollingUnit_Code, election_name
            })

            if (staleElectionResult) {
                logger.info(`${staleElectionResult._id} found. Start of enrichment process`)
                logger.info('phase one : create party vote instances')
                await Promise.all(party_Votes.map(async (party_vote) => {
                    let partyResult = await PartyResult.create({
                        name: party_vote.name,
                        description: party_vote.description,
                        pollingUnitCode: party_vote.pollingUnitCode,
                        logo: party_vote.logo,
                        vote: party_vote.vote,
                        isAgentEndorsed: party_vote.isAgentEndorsed
                    })
                    let pVSO_id = await partyResult.save()
                    partyVotesId.push(pVSO_id)
                }))

                await ElectionResult.deleteOne({
                    _id: staleElectionResult._id
                })
                logger.info('Deleting stale election instance from data store complete')
                await redisClient.del(staleElectionResult.pollingUnit_Code)
                logger.info('Purging stale election info from cache complete')

                logger.info('Building new election instance ')
                let electionResult = await ElectionResult.create({
                    pollingUnit_Country: '',
                    pollingUnit_State: staleElectionResult.pollingUnit_State,
                    pollingUnit_LGA: staleElectionResult.pollingUnit_LGA,
                    pollingUnit_name: staleElectionResult.pollingUnit_name,
                    pollingUnit_Code: staleElectionResult.pollingUnit_Code,
                    election_name: staleElectionResult.election_name,
                    meta: {
                        result_sheet_meta: {
                            resultSheet_State_Code: resultSheet_State_Code,
                            resultSheet_LGA_Code: resultSheet_LGA_Code,
                            resultSheet_RegistrationArea_Code: resultSheet_RegistrationArea_Code,
                            resultSheet_PollingUnit_Code: resultSheet_PollingUnit_Code,
                            resultSheet_RegisteredVoters: resultSheet_RegisteredVoters,
                            resultSheet_IssuedBallotPapers: resultSheet_IssuedBallotPapers,
                            resultSheet_SpoiledBallotPapers: resultSheet_SpoiledBallotPapers,
                            resultSheet_RejectedBallotPapers: resultSheet_RejectedBallotPapers,
                            resultSheet_ValidVotes: resultSheet_ValidVotes,
                            resultSheet_totalUnusedBallotPapers: resultSheet_totalUnusedBallotPapers
                        },
                        party_Votes: []
                    }
                })

                logger.info('election Instance completed')
                await Promise.all(partyVotesId.map(async (party_object) => {
                    electionResult.meta.party_Votes.push(party_object)
                }))
                logger.info('enriched started')
                let eEIR = await electionResult.save()
                logger.info('enriched item committed tp datastore')
                logger.info('writing enriched item to cache')
                await redisClient.set(pollingUnit_Code, JSON.stringify(eEIR), {
                    ex: 120,
                    NX: true
                })
                logger.info('cache write successful')
                res.status(200);
                res.json({
                    id: eEIR._id
                })
            } else {
                res.status(200);
                res.json({
                   message: `unique instance of Polling unit ${pollingUnit_Code} and election name ${election_name} not found`
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
        logger.info('missing required attributes')
        res.status(400);
        res.json({
            message: "Missing required values to complete this transaction"
        })
    }
};