

const express = require('express');
const router = express.Router();

const { collationController }  = require('../../../controllers');
const  collationCache   = require('../../../middlewares/collationCache')
const  { checkJwt }   = require('../../../middlewares/checkJwt')
const  { checkAccountStatus }   = require('../../../middlewares/checkAccountStatus')
const  { chargePerRequest }   = require('../../../middlewares/chargePerRequest')
const districtCache = require("../../../middlewares/districtCache");

/*
* *********************************GET*****************************************
*/

router.get('/', collationController.getResult);

module.exports = router;