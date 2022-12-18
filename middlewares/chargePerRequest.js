
const User = require("../models/User");
const { authController } = require('../controllers')
const ResponseTypes = require("../constants/ResponseTypes");

/**
 * This middleware updates the dailyCounter by one for any endpoint which this fronts
 * This is to enable we charge the user for any business endpoint they hit
 * @param req
 * @param res
 * @param next
 * @returns {Promise<*>}
 */
const chargePerRequest = async (req, res, next) => {
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
   try{
       const user = await User.findOne({}).byEmail(key);
           user.dailyCounter = user.dailyCounter + 1
           logger.info('logging and billing hit on business endpoint')
           await user.save()
           logger.info(`user ${user.email} charged for this request on endpoint ${req.path}`)
            let preAccessChecks = await authController.buildCaseForAccess(user)
       if (!preAccessChecks.isRequestGranted){
           logger.info(`user ${user.email} has exceeded their quota for ${req.url} , account will be locked`)
           await authController.lock(user, {
               code: 'ACCOUNT_LIMIT',
               description: 'Account limit exceeded'
           })
       } else if (preAccessChecks.meta.durationSinceLastAccess > 24.00000) {
           logger.info(`checking to see if account needs to be unlocked`)
           await authController.unlockAccountBasedOnElapsedTimeLimit(preAccessChecks, user)
       }
       if (!user.accountState.disabled.isDisabled) {
           next();
       } else {
           res.json({
               message: ResponseTypes.SUCCESS["200"],
               businessError: {
                   tokenAccess: preAccessChecks.isRequestGranted,
                   accountState: preAccessChecks.meta.accountState,
                   message: preAccessChecks.meta.message
               }
           })
       }
   }catch(error){
       //this is a counter endpoint, we do not want any failures at this point
       //regardless send the user to next phase
       next()
   }
};



module.exports = {chargePerRequest};