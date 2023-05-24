

const express = require('express');
const router = express.Router();
const { recommendationController }  = require('../../../controllers');



/*
* *********************************GET*****************************************
*/

router.post('/', recommendationController.recommendation);

router.get('/history', recommendationController.appList)

module.exports = router;