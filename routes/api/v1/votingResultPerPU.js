/**
 * Created by maryobikwelu on 4/6/20
 */


const express = require('express');
const router = express.Router();

const { votingResultController }  = require('../../../controllers');
const  electionCache   = require('../../../middlewares/electionCache')

/*
* *********************************GET*****************************************
*/

router.get('/', votingResultController.getVotingResultPerPU);


module.exports = router;