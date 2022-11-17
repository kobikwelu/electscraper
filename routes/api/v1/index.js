const express = require('express');
const router = express.Router();

const electionResultRouter = require('./electionResult');
const votingResultPerPURouter = require('./votingResultPerPU');
const votingResultPerGEORouter = require('./votingResultPerGEO');
const pollingUnitRouter = require('./pollingUnit');
const wardRouter = require('./ward');
const lgaRouter = require('./lga');

/**
 * v1 master route. All api's must have a pattern and be inserted here
 * All non-auth routes must be protected by the jwt check.
 * The check should not be done here, but rather should be done at the business feature's root path
 *
 */

router.use('/electionResult', electionResultRouter);
router.use('/votingResultPerPU', votingResultPerPURouter);
router.use('/votingResultPerGEO', votingResultPerGEORouter);
router.use('/pollingUnit', pollingUnitRouter);

router.use('/ward', wardRouter);
router.use('/lga', lgaRouter);


module.exports = router;
