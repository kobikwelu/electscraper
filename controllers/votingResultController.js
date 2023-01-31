

const ElectionResult = require("../models/PollingUnitResult");
const PartyResult = require("../models/PartyResult");


exports.getVotingResultPerPU = async (req, res) => {
    const {pollingUnit_Codes, election_name} = req.body


    if (pollingUnit_Codes && election_name) {
        try {
           let electionPayload  = await findResultPerPUinBatch(pollingUnit_Codes, election_name)
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

//TODO: Convert geo from frontend and route it to a LGA
    //TODO: GET ALL VOTES FROM PU in that LGA and display
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

const getTotalVotesInLGA = async (localGov, electionName) =>{

}

const getTotalVotesInWard = async (localGov, electionName) =>{

}

/**
 *
 * @param pollingUnit_Codes
 * @param election_name
 * @returns {Promise<{election_name, votes: *[]}>}
 */
const findResultPerPUinBatch = async (pollingUnit_Codes, election_name) =>{
    let electionPayload = {
        election_name: election_name,
        votes: []
    }

    await Promise.all(pollingUnit_Codes.map(async (pollingUnit_Code) => {
        let activeElectionResult = await ElectionResult.findOne({
            pollingUnit_Code, election_name
        })
        if (activeElectionResult){
            let rawVotesIds = activeElectionResult.meta.party_Votes
            await Promise.all(rawVotesIds.map(async (voteId) => {
                let activeVote = await PartyResult.findOne({
                    _id: voteId
                })
                electionPayload.votes.push(activeVote)
            }))
        }
    }))
    return electionPayload
}

const findPUsInWard = async ()=>{

}

const findWardsInLGA = async ()=>{

}

const findLGAsInState = async ()=>{

}