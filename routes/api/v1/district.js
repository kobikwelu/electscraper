const express = require('express');
const router = express.Router();

const { districtController}  = require('../../../controllers');
const  districtCache   = require('../../../middlewares/districtCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')

router.get('/', [checkJwt, checkAccountStatus, chargePerRequest, districtCache.getCachedDistrict], districtController.getDistrict);



module.exports = router;