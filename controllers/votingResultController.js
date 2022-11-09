

const ElectionResult = require("../models/ElectionResult");
const PartyResult = require("../models/PartyResult");


exports.getVotingResultPerPU = async (req, res) => {
    const {pollingUnit_Codes, election_name} = req.body

    let electionPayload = {
        election_name: election_name,
        votes: []
    }

    if (pollingUnit_Codes && election_name) {
        try {
            await Promise.all(pollingUnit_Codes.map(async (pollingUnit_Code) => {
                let activeElectionResult = await ElectionResult.findOne({
                    pollingUnit_Code, election_name
                })
                logger.info('election Instance found')
                let rawVotesIds = activeElectionResult.meta.party_Votes
                logger.info('building votes results')
                await Promise.all(rawVotesIds.map(async (voteId) => {
                    let activeVote = await PartyResult.findOne({
                       _id: voteId
                    })
                    electionPayload.votes.push(activeVote)
                }))
            }))
            logger.info('building votes results')
            res.status(200);
            res.json({
                electionPayload
            })


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

exports.getVotingResultPerGEO = async (req, res) => {
    const {pollingUnit_Codes, election_name} = req.body


    if (pollingUnit_Codes && election_name) {
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