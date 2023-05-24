const express = require('express');
const router = express.Router();

const { lgaController}  = require('../../../controllers');
const lgaCache   = require('../../../middlewares/lgaCache')
const {checkJwt} = require('../../../middlewares/checkJwt')
const {checkAccountStatus} = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')

router.get('/', [checkJwt, checkAccountStatus, chargePerRequest, lgaCache.getCachedLGAData], lgaController.getWardInLGA);



module.exports = router;