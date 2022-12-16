const express = require('express');
const router = express.Router();

const { wardController}  = require('../../../controllers');
const  wardCache   = require('../../../middlewares/wardCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')


router.get('/', [checkJwt, checkAccountStatus, wardCache.getCachedWardData], wardController.getPuInWard);



module.exports = router;