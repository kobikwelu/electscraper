/**
 * Created by maryobikwelu on 4/6/20
 */


const express = require('express');
const router = express.Router();

const { electionResultController }  = require('../../../controllers');
const  electionCache   = require('../../../middlewares/electionCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')

/*
* *********************************POST*****************************************
*/

router.get('/', [checkJwt, checkAccountStatus, electionCache.getCachedElectionData], electionResultController.getElectionResult);

router.post('/',   [electionCache.preInsertCacheCheck], electionResultController.insertElectionResult);

router.patch('/', electionResultController.updateElectionResult);

module.exports = router;