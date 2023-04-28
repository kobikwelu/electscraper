

const express = require('express');
const router = express.Router();
const { recommendationController }  = require('../../../controllers');



/*
* *********************************GET*****************************************
*/

router.post('/', recommendationController.recommendation);

module.exports = router;