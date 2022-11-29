const Senatorial = require("../models/Senatorial");
const FederalConstituency = require("../models/FederalConstituency");
const Candidate = require("../models/Candidate");
const lodash = require("lodash")


exports.getDistrict = async (req, res) => {
    const {state} = req.body

    let result = {
        senate: {},
        houseOfAssembly: {}
    }

    if (state) {
        try {
            let returnedSenatorialDistricts = await Senatorial.find({
                state: state
            })
            let returnedFederalConstituencies = await FederalConstituency.find({
                state: state
            })

        await Promise.all(returnedSenatorialDistricts.map(async (senatorialDistrict) => {
               let senatorialCandidates = await Candidate.find({
                   state: state,
                   constituency: senatorialDistrict.senate_constituency_name
               })
                return senatorialDistrict.candidates = senatorialCandidates
            }))

             await Promise.all(returnedFederalConstituencies.map(async (federalDistrict)=>{
               let federalConstituencyCandidates  = await Candidate.find({
                    state: state,
                    constituency: federalDistrict.federal_constituency_name
                })
                return federalDistrict.candidates = federalConstituencyCandidates
            }))
            result.senate.senatorialDistrict = returnedSenatorialDistricts
            result.houseOfAssembly.federalDistricts = returnedFederalConstituencies

            await redisClient.set(state, JSON.stringify(result), {
                ex: 120,
                NX: true
            })
            logger.info('cache write successful')
            res.status(200);
            res.json({
                result
            })
        } catch (error) {
            logger.error(error)
            if (error.message.includes('Cannot read property')) {
                logger.warn('caching process failed')
                res.status(200);
                res.json({
                    result: result
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