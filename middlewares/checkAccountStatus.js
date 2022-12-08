const ResponseTypes = require('../constants/ResponseTypes');
const {authController} = require('../controllers');


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
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    const accountStateErrors = await authController.getAccountState(key);
    if (accountStateErrors && !req.originalUrl.includes('/myuser')) {
        return await buildAccountStatusMessage(accountStateErrors, res);
    } else {
        if (accountStateErrors === ResponseTypes.SUCCESS.BUSINESS_NOTIFICATION.EMAIL_CONFIRMATION_STILL_PENDING){
            res.locals.accountStateErrors = accountStateErrors;
        }
        next();
    }
};

const buildAccountStatusMessage = async (accountStateErrors, res) => {
    if (accountStateErrors === ResponseTypes.ERROR["500"]) {
        res.status(500);
        res.json({
            message: ResponseTypes.ERROR["500"],
        })
    } else {
        res.status(401);
        res.json({
            message: ResponseTypes.ERROR["401"],
            description: accountStateErrors
        })
    }
};

module.exports = {checkAccountStatus};