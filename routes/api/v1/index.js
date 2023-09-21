const express = require('express');
const router = express.Router();

const recommendationRouter = require('./recommendation');
const statusRouter = require('./status');
const blogRouter = require('./blog');
const userRouter = require('./user');
const updatefpguideRouter = require('./updatefpguide');

/**
 * v1 master route. All api's must have a pattern and be inserted here
 * All non-auth routes must be protected by the jwt check.
 * The check should not be done here, but rather should be done at the business feature's root path
 *
 */


router.use('/user', userRouter)

router.use('/blog', blogRouter)

router.use('/recommendation', recommendationRouter)

router.use('/updatefpguide', updatefpguideRouter)

router.use('/status', statusRouter)

module.exports = router;
