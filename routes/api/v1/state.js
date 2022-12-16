const express = require('express');
const router = express.Router();

const { stateController}  = require('../../../controllers');
const  stateCache   = require('../../../middlewares/stateCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')


router.get('/', [checkJwt, checkAccountStatus, stateCache.getCachedStateData], stateController.getLGAInState);



module.exports = router;