const express = require('express');
const router = express.Router();

const { districtController}  = require('../../../controllers');
const  districtCache   = require('../../../middlewares/districtCache')


router.get('/', [districtCache.getCachedDistrict], districtController.getDistrict);



module.exports = router;