const express = require('express');
const router = express.Router();

const { districtController}  = require('../../../controllers');
const  districtCache   = require('../../../middlewares/districtCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')

router.get('/', [checkJwt, checkAccountStatus, districtCache.getCachedDistrict], districtController.getDistrict);



module.exports = router;