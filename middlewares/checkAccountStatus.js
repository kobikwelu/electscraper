const ResponseTypes = require('../constants/ResponseTypes');
const {authController} = require('../controllers');
const User = require('../models/User');


/**
 *
 * @param req
 * @param res
 * @param next
 *
 * x-key = email
 * @returns {Promise<void>}
 */
const checkAccountStatus = async (req, res, next) => {
    let user;
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    logger.info('key ' + key)
    user = await User.findOne({}).byEmail(key);
    const accountStateErrors = await authController.getAccountState(key);
    if (accountStateErrors.description === ResponseTypes.SUCCESS.BUSINESS_NOTIFICATION.EMAIL_CONFIRMATION_STILL_PENDING) {
        if (user.isOnBoardingComplete){
            return buildAccountStatusMessage(accountStateErrors, res)
        } else {
            next()
        }
    } else if (accountStateErrors.code === 'ACCOUNT_LIMIT') {
        return buildAccountStatusMessage(accountStateErrors, res)
    } else {
        next();
    }
};

const buildAccountStatusMessage = async (accountStateErrors, res) => {
    if (accountStateErrors.code === 'ACCOUNT_LIMIT' || accountStateErrors.description === ResponseTypes.SUCCESS.BUSINESS_NOTIFICATION.EMAIL_CONFIRMATION_STILL_PENDING) {
        res.status(200);
        res.json({
            businessError: {
                accountState: 'Disabled',
                code: accountStateErrors.code,
                message: accountStateErrors.description
            }
        })
    }
}

module.exports = {checkAccountStatus};