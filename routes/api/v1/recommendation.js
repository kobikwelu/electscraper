

const express = require('express');
const router = express.Router();
const { recommendationController }  = require('../../../controllers');
const {checkJwt} = require("../../../middlewares/checkJwt");
const {checkAccountStatus} = require("../../../middlewares/checkAccountStatus");



/*
* *********************************GET*****************************************
*/

router.post('/', [checkJwt, checkAccountStatus], recommendationController.recommendation);

router.get('/', [checkJwt, checkAccountStatus], recommendationController.getLatestRecommendation);

router.get('/tray',[checkJwt, checkAccountStatus],  recommendationController.appList)

router.post('/trackuserinteraction', [checkJwt, checkAccountStatus], recommendationController.trackUserInteractions)

module.exports = router;