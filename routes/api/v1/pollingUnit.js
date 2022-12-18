const express = require('express');
const router = express.Router();

const { pollingUnitController}  = require('../../../controllers');
const  pollingUnitCache   = require('../../../middlewares/pollingUnitCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')

router.get('/', [checkJwt, checkAccountStatus, chargePerRequest, pollingUnitCache.getCachedDataPoint], pollingUnitController.getDataPoint);



module.exports = router;