const express = require('express');
const router = express.Router();

const { financialGuidesController }  = require('../../../controllers');
const upload = require('../../../middlewares/upload');
const {checkJwt} = require("../../../middlewares/checkJwt");


router.post('/', [checkJwt, upload.upload.single('apps_list')], financialGuidesController.insertFinancialApps);

module.exports = router;
