

const ResponseTypes = require('../constants/ResponseTypes');
const {authController} = require('../controllers');


/**
 *
 * @param req
 * @param res
 * @param next
 *
 * x-key = email
 * x-access-token = token
 * origin = domain issuer
 */
const checkJwt = async (req, res, next) => {
    const token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    const origin = req.get('origin');

    if (token && key && origin) {
        const possibleErrorResponse = await authController.verifyToken(token, key, origin);
        if (possibleErrorResponse) {
            await buildErrorMessage(possibleErrorResponse, res);
        } else {
            next();
        }
    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_PARAMETER_T_K_O
        });
    }
}

const buildErrorMessage = async (possibleErrorResponse, res) => {
    if (possibleErrorResponse === ResponseTypes.ERROR["500"]) {
        res.status(500);
        res.json({
            message: ResponseTypes.ERROR["500"],
        })
    } else {
        res.status(401);
        res.json({
            message: ResponseTypes.ERROR["401"],
            description: possibleErrorResponse
        })
    }
}

module.exports = {checkJwt};
