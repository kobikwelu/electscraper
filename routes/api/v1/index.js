const express = require('express');
const router = express.Router();

const electionResultRouter = require('./electionResult');


/**
 * v1 master route. All api's must have a pattern and be inserted here
 * All non-auth routes must be protected by the jwt check.
 * The check should not be done here, but rather should be done at the business feature's root path
 *
 */

router.use('/electionResult', electionResultRouter);


module.exports = router;
