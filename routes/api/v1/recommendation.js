

const express = require('express');
const router = express.Router();
const { recommendationController }  = require('../../../controllers');



/*
* *********************************GET*****************************************
*/

router.post('/', recommendationController.recommendation);

router.get('/', recommendationController.getLatestRecommendation);

router.get('/tray', recommendationController.appList)

router.post('/trackuserinteraction', recommendationController.trackUserInteractions)

module.exports = router;