const express = require('express');
const router = express.Router();

const { statusController}  = require('../../../controllers');


router.get('/', statusController.return200);



module.exports = router;