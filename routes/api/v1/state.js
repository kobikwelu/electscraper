const express = require('express');
const router = express.Router();

const { stateController}  = require('../../../controllers');
const  stateCache   = require('../../../middlewares/stateCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')

router.get('/', [checkJwt, checkAccountStatus, chargePerRequest, stateCache.getCachedStateData], stateController.getLGAInState);



module.exports = router;