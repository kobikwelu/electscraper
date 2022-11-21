const express = require('express');
const router = express.Router();

const { stateController}  = require('../../../controllers');
const  stateCache   = require('../../../middlewares/stateCache')


router.get('/', [stateCache.getCachedStateData], stateController.getLGAInState);



module.exports = router;