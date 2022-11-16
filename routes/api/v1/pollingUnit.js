const express = require('express');
const router = express.Router();

const { pollingUnitController}  = require('../../../controllers');
const  pollingUnitCache   = require('../../../middlewares/pollingUnitCache')


router.get('/', [pollingUnitCache.getCachedDataPoint], pollingUnitController.getDataPoint);



module.exports = router;