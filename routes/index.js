const express = require('express');
const router = express.Router();
const v1APIRouter = require('./api/v1');

/**
 * Master versioning routes. Except auth, everything else goes into a version
 */


router.use('/api/v1', v1APIRouter);

module.exports = router;
