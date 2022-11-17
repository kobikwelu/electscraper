const express = require('express');
const router = express.Router();

const { wardController}  = require('../../../controllers');
const  wardCache   = require('../../../middlewares/wardCache')


router.get('/', [wardCache.getCachedWardData], wardController.getPuInWard);



module.exports = router;