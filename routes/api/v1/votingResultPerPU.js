/**
 * Created by maryobikwelu on 4/6/20
 */


const express = require('express');
const router = express.Router();

const { votingResultController }  = require('../../../controllers');
const  electionCache   = require('../../../middlewares/electionCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
/*
* *********************************GET*****************************************
*/

router.get('/', [checkJwt, checkAccountStatus], votingResultController.getVotingResultPerPU);


module.exports = router;