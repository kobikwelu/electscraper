const express = require('express');
const router = express.Router();

const { pollingUnitController}  = require('../../../controllers');
const  pollingUnitCache   = require('../../../middlewares/pollingUnitCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')

router.get('/', [checkJwt, checkAccountStatus, pollingUnitCache.getCachedDataPoint], pollingUnitController.getDataPoint);



module.exports = router;