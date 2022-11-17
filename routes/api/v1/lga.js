const express = require('express');
const router = express.Router();

const { lgaController}  = require('../../../controllers');
const  lgaCache   = require('../../../middlewares/lgaCache')


router.get('/', [lgaCache.getCachedLGAData], lgaController.getWardInLGA);



module.exports = router;