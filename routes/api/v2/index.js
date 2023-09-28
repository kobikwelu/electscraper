const express = require('express');
const router = express.Router();

const recommendationV2Router = require('./recommendationV2');

/**
 * v1 master route. All api's must have a pattern and be inserted here
 * All non-auth routes must be protected by the jwt check.
 * The check should not be done here, but rather should be done at the business feature's root path
 *
 */



router.use('/recommendation', recommendationV2Router)

module.exports = router;
