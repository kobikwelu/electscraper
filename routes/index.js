const express = require('express');
const router = express.Router();
const v1APIRouter = require('./api/v1');
const v2APIRouter = require('./api/v2');

/**
 * Master versioning routes. Except auth, everything else goes into a version
 */


router.use('/api/v1', v1APIRouter);
router.use('/api/v2', v2APIRouter);

module.exports = router;
