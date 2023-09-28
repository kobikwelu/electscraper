

const express = require('express');
const router = express.Router();
const { recommendationControllerV2 }  = require('../../../controllers');
const {checkJwt} = require("../../../middlewares/checkJwt");
const {checkAccountStatus} = require("../../../middlewares/checkAccountStatus");



/*
* *********************************GET*****************************************
*/



router.get('/tray',[checkJwt, checkAccountStatus],  recommendationControllerV2.appListV2)

module.exports = router;