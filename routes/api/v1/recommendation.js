

const express = require('express');
const router = express.Router();
const { recommendationController }  = require('../../../controllers');
const {checkJwt} = require("../../../middlewares/checkJwt");
const {checkAccountStatus} = require("../../../middlewares/checkAccountStatus");



/*
* *********************************GET*****************************************
*/

router.post('/', recommendationController.recommendation);

router.get('/', recommendationController.getLatestRecommendation);

router.get('/tray',[checkJwt, checkAccountStatus],  recommendationController.appList)

router.post('/trackuserinteraction', recommendationController.trackUserInteractions)

module.exports = router;