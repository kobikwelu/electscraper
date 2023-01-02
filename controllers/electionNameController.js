const ElectionName = require('../models/ElectionName')


exports.getElectionName = async (req, res) => {
    const {election_group} = req.body

    if (election_group) {
        try{
            let electionNames = await ElectionName.find({
                "election_group":{
                    "$regex": '^' + election_group
                }
            })
            logger.info('returning election names')
            res.status(200)
            res.json({
                electionNames
            })
        }catch (error){
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