

const express = require('express');
const router = express.Router();

const { electionNameController }  = require('../../../controllers');
const  electionCache   = require('../../../middlewares/electionCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')

/*
* *********************************GET*****************************************
*/

router.get('/', [checkJwt, checkAccountStatus, chargePerRequest], electionNameController.getElectionName);

module.exports = router;