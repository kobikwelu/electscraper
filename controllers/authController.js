
const bcrypt = require('bcryptjs');
const uuid = require('uuid/v4');
let jwt = require('jwt-simple');
const password = require('generate-password');

const ResponseTypes = require('../constants/ResponseTypes');
const configs = require(`../config/env/${process.env.NODE_ENV}`);

const User = require('../models/User');
const {authBusinessRules} = require('../businessRules')


const notificationController = require('../controllers/notificationController');

const keys = require('../config');
const fs = require('fs');

const SALT_ROUNDS = 10;
const MILLISECONDS = 60000;



const genToken = async (role, username, email) => {
    logger.info('gen token starts')
    let expiresAt = await expiresInV3(1440);
    let issuedAt = await getCurrentTimeV2();
    let token = jwt.encode({
        //TODO: issuer/request (origin) source must be added for extra security
        issuer   : "http://localhost:8080",
        //issuer: `${keys.Origin_backend}`,
        issuedAt: issuedAt,
        expiresAt: expiresAt,
        role: role,
        email: email
    }, await getSigningKey('private'), 'HS512');
    return {
        token: token,
        issuedAt: issuedAt,
        expires: expiresAt
    };
}


const expiresInV3 = async (numberOfMinutes) => {
    return await getCurrentTimeV2() + numberOfMinutes * MILLISECONDS
}
const getCurrentTimeV2 = async () => {
    let dateObj = new Date();
    return dateObj.getTime()
}

/**
 *
 * @param token
 * @param key
 * @param origin
 * @returns {Promise<string|null>}
 */
exports.verifyToken = async (token, key, origin) => {
    try {
        const decodedPayload = await jwt.decode(token, await getSigningKey('private'), false, 'HS512')
        logger.info('decoded token '+ decodedPayload)
        if (await isTokenValid(decodedPayload.expiresAt)) {
            if (await isTrustedSource(decodedPayload.issuer, origin)) {
                if (await isSameUser(decodedPayload.email, key)) {
                    return null;
                } else {
                    return ResponseTypes.ERROR.MESSAGES.INCORRECT_TOKEN_USED
                }
            } else {
                return ResponseTypes.ERROR.MESSAGES.UNIDENTIFIED_DOMAIN
            }
        } else {
            return ResponseTypes.ERROR.MESSAGES.EXPIRED_TOKEN
        }
    } catch (error) {
        console.log(error);
        return ResponseTypes.ERROR["500"]
    }
}

/**
 *
 * @param key
 * @returns {Promise<string|null>}
 */
exports.getAccountState = async(key)=>{
    try{
        const user = await User.findOne({}).byEmail(key);
        const { isAccountActive, isEmailConfirmed} = user;
        if (isEmailConfirmed){
            return null
        }else {
            return ResponseTypes.SUCCESS.BUSINESS_NOTIFICATION.EMAIL_CONFIRMATION_STILL_PENDING
        }
    }catch(error){
        console.log(error);
        return ResponseTypes.ERROR["500"]
    }

}

/**
 *
 * @param expiresAt
 * @returns {Promise<boolean>}
 */
const isTokenValid = async (expiresAt) => {
    return expiresAt > await getCurrentTimeV2();
}

/**
 *
 * @param issuer
 * @param origin
 * @returns {Promise<boolean>}
 */
const isTrustedSource = async (issuer, origin) => {
    if ((process.env.NODE_ENV === 'development') || (process.env.NODE_ENV === 'staging')) {
        return true
    } else {
        return issuer === origin
    }
}

/**
 *
 * @param email
 * @param key
 * @returns {Promise<boolean>}
 */
const isSameUser = async (email, key) => {
    return email === key
}

/**
 *
 * @param typeOfKey
 * @returns {Promise<string|*>}
 */
const getSigningKey = async (typeOfKey) => {
    if (process.env.NODE_ENV === 'staging') {
        if (typeOfKey === 'public') {
            return keys.key.public
        } else {
            return keys.key.private
        }
    }
    if (process.env.NODE_ENV === 'development') {
        const devPrivateKeys = fs.readFileSync('./private.key', 'utf8');
        const devPublicKeys = fs.readFileSync('./public.key', 'utf8');
        if (typeOfKey === 'public') {
            return devPrivateKeys
        } else {
            return devPublicKeys
        }
    }
}

/**
 *
 * @returns {Promise<string>}
 */
const generateTemporaryPassword = async () => {
    return password.generate({
        length: 10,
        numbers: true,
        uppercase: true,
        lowercase: true,
        exclude: "?&%^$#~`()+_-*{}[]|"
    })
}



/**
 *
 * @param email
 * @returns {Promise<void>}
 */
const deleteUser = async (email) => {
    if (email) {
        try {
            await User.deleteOne({email});
        } catch (error) {
            console.log(error)
        }
    } else {
        //do nothing
    }
}


/**
 * emailActivationTokenExpiryDate - 2 days -> total minutes in 2 days -> 2880
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.signUp = async (req, res) => {
    const { email, role, password, name } = req.body;
    const unHashedPassword = password;

    if (email && role && unHashedPassword && name) {
        let user = null;
        try {
            const count = await User.countDocuments({email});
            if (count > 0) {
                res.status(401);
                res.json({
                    message: ResponseTypes.ERROR["401"],
                    description: ResponseTypes.ERROR.MESSAGES.ACCOUNT_EXISTS
                })
            } else {
                const password = await bcrypt.hash(unHashedPassword, SALT_ROUNDS);
                user = await User.create({
                    email,
                    password,
                    name,
                    role,
                    emailActivationToken: uuid(),
                    emailActivationTokenExpiryDate: await expiresInV3(2880)
                })
                logger.info('user instance created ')
                await user.save();
                logger.info('user instance saved ')
                const activationLink = `${keys.Origin_backend}/api/v1/user/activateAccount/${user.emailActivationToken}&email=${user.email}`;
                logger.info('activation link created')
                await notificationController.sendEmailMessage(user, {
                    subject: ResponseTypes.SUCCESS.MESSAGES.REGISTRATION_CONFIRM,
                    activationLink
                });
                logger.info('notification sent to user ' + user._id)
                res.json({
                    message: ResponseTypes.SUCCESS.MESSAGES.SUBSCRIPTION_PENDING,
                    user: {
                        email: user.email,
                        user_id: user._id.toString()
                    }
                })
            }
        } catch (error) {
            logger.info(error)
            if (user){
                await deleteUser(user.email);
            }
            if (error._message === 'User validation failed'){
                res.status(400);
                res.json({
                    message: ResponseTypes.ERROR["400"]
                })
            } else {
                res.status(500);
                res.json({
                    message: ResponseTypes.ERROR["500"]
                })
            }
        }
    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_ATTRIBUTE_BODY
        })
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.signIn = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (email && password) {
        let user = null;

        try {
            user = await User.findOne({}).byEmail(email);
            if (user === null) {
                res.status(401);
                res.json({
                    message: ResponseTypes.ERROR["401"],
                    description: ResponseTypes.ERROR.MESSAGES.INVALID_CREDENTIALS
                })
            } else {
                const rulesReportArray = await authBusinessRules.applyLoginRules(user, password);
                if (rulesReportArray.indexOf('Invalid credentials') !== -1){
                    res.status(401);
                    res.json({
                        message: ResponseTypes.ERROR["401"],
                        description: ResponseTypes.ERROR.MESSAGES.INVALID_CREDENTIALS
                    })
                } else {
                    if (rulesReportArray.length === 0) {
                        logger.info('')
                        const doesMatch = await bcrypt.compare(password, user.password);
                        if (doesMatch) {
                            user.lastLoginTime = new Date();
                            user.markModified('lastLoginTime');
                            await user.save();
                            logger.info('issuing token')
                            res.json({
                                message: ResponseTypes.SUCCESS["200"],
                                payload: await genToken(user.role, user.username, user.email),
                                isEmailConfirmed: user.isEmailConfirmed
                            })
                        } else {
                            res.status(401);
                            res.json({
                                message: ResponseTypes.ERROR["401"],
                                description: ResponseTypes.ERROR.MESSAGES.INVALID_CREDENTIALS
                            })
                        }
                    } else {
                        const rulesReport = Object.assign({}, rulesReportArray);
                        res.json({
                            message: ResponseTypes.SUCCESS["200"],
                            businessErrors: rulesReport
                        })

                    }
                }
            }
        } catch (error) {
            console.log(error)
            res.status(500);
            res.json({
                message: ResponseTypes.ERROR["500"]
            })
        }
    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_ATTRIBUTE_BODY
        })
    }
}


/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 * The assumption is that this method should be called only with a valid token
 **/

exports.getUser = async (req, res) => {
    try {
        const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
        let user;

        user = await User.findOne({}).byEmail(key);
        if (user === null) {
            await auditLogsController.addLog(key, req.useragent, 'get user', ResponseTypes.ERROR["401"], ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND);
            res.status(401);
            res.json({
                description: ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND
            })
        } else {
            await auditLogsController.addLog(user.email, req.useragent, 'get user', ResponseTypes.SUCCESS["200"], 'account information retrieved');
            res.status(200);
            res.json({
                message: ResponseTypes.SUCCESS["200"],
                user: {
                    _id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                warning: res.locals.accountStateErrors
            })
        }
    } catch (error) {
        await auditLogsController.addLog(key, req.useragent, 'get user', ResponseTypes.ERROR["500"], error);
        res.status(500);
        res.json({
            message: ResponseTypes.ERROR["500"]
        })
    }

}

/**
 *key -> user email
 * @param req
 * @param res
 * @returns {Promise<void>}
 *!
 **/

exports.updateUser = async (req, res) => {
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    let user = null;
    const allowedKeys = [
        'name',
        'profileImageUrl',
        'bioInfo',
        'address'
    ];
    try {
        user = await User.findOne({key});
        if (!user) {
            res.status(401);
            res.json({
                description: ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND
            })
        } else {
            Object.entries(req.body).forEach(([key, value]) => {
                if (allowedKeys.includes(key)) {
                    if (typeof user[key] !== 'undefined') {
                        user[key] = value;
                    } else if (typeof user.profile[key] !== 'undefined') {
                        user.profile[key] = value;
                    }
                }
            });
        }
        await user.save();
        await auditLogsController.addLog(user.email, req.useragent, 'update user', ResponseTypes.SUCCESS["200"], 'update successful');
        res.status(200);
        res.json({
            description: ResponseTypes.SUCCESS["200"]
        })
    } catch (error) {
        await auditLogsController.addLog(key, req.useragent, 'update user', ResponseTypes.ERROR["500"], error);
        res.status(500);
        res.json({
            description: ResponseTypes.ERROR["500"]
        })
    }
}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 *
 * The following security features are set here
 *
 * showChangePasswordGate: true,
 * temporaryPassword: generateTemporaryPassword,
 * disableAccount: true

 These security features will be reset in authResetPasswordUponLogin
 **/
exports.nonAuthResetPasswordRequest = async (req, res) => {
    const email = req.body.email;
    if (email) {
        try {
            const user = await User.findOne({}).byEmail(email);
            const newTemporaryPassword = await generateTemporaryPassword();
            if (user) {
                const payload = {
                    temporaryPassword: newTemporaryPassword,
                    subject: ResponseTypes.SUCCESS.MESSAGES.PASSWORD_RESET_INITIAL,
                    email
                }
                await notificationController.sendEmailMessage(user, payload);
                const userTriggeredProcessUpdate = {
                    showChangePasswordGate: true,
                    temporaryPassword: await bcrypt.hash(newTemporaryPassword, SALT_ROUNDS),
                    disableAccount: true
                }
                const allowedKeys = [
                    'showChangePasswordGate',
                    'temporaryPassword',
                    'disableAccount'
                ];

                Object.entries(userTriggeredProcessUpdate).forEach(([key, value]) => {
                    if (allowedKeys.includes(key)) {
                        if (typeof user[key] !== 'undefined') {
                            user[key] = value;
                        }
                    }
                });

                await user.save();
                await auditLogsController.addLog(email, req.useragent, 'updated security features',
                    'success', '' + userTriggeredProcessUpdate.showChangePasswordGate + ', ' +
                    userTriggeredProcessUpdate.temporaryPassword + ', ' + userTriggeredProcessUpdate.disableAccount)
                res.status(200);
                res.json({
                    description: ResponseTypes.SUCCESS.MESSAGES.TEMPORARY_PASSWORD_SENT
                })
            } else {
                res.status(401);
                res.json({
                    description: ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND
                })
            }
        } catch (error) {
            console.log(error)
            res.status(500);
            res.json({
                description: ResponseTypes.ERROR["500"]
            })
        }
    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_ATTRIBUTE_BODY
        })
    }
}


/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 *
 * The following security features are set here
 *
 * showChangePasswordGate: false,
 * temporaryPassword: null,
 * disableAccount: false,
 * password: password
 **/

exports.nonAuthResetPasswordPriorToLogin = async (req, res) => {
    const {temporaryPassword, newPassword, email} = req.body;
    const user = await User.findOne({}).byEmail(email);

    if (temporaryPassword && newPassword && email) {
        try {
            if (user === null) {
                await auditLogsController.addLog(email, req.useragent, 'reset temporary password', ResponseTypes.ERROR["401"],
                    ResponseTypes.ERROR.MESSAGES.ACCOUNT_DOES_NOT_EXIST);
                res.status(401);
                res.json({
                    message: ResponseTypes.ERROR["401"],
                    description: ResponseTypes.ERROR.MESSAGES.ACCOUNT_DOES_NOT_EXIST
                })
            } else {
                const isBothPasswordMatched = await bcrypt.compare(temporaryPassword, user.temporaryPassword);
                if (isBothPasswordMatched) {
                    const password = await bcrypt.hash(newPassword, SALT_ROUNDS);
                    const payload = {
                        showChangePasswordGate: false,
                        temporaryPassword: null,
                        disableAccount: false,
                        password: password
                    }
                    const allowedKeys = [
                        'showChangePasswordGate',
                        'temporaryPassword',
                        'disableAccount',
                        'password'
                    ]


                    Object.entries(payload).forEach(([key, value]) => {
                        if (allowedKeys.includes(key)) {
                            if (typeof user[key] !== 'undefined') {
                                user[key] = value;
                            }
                        }
                    });

                    user.save();
                    await auditLogsController.addLog(user.email, req.useragent, 'password reset', ResponseTypes.SUCCESS["200"], ResponseTypes.SUCCESS.MESSAGES.PASSWORD_RESET_SUCCESS);
                    res.status(200);
                    res.json({
                        message: ResponseTypes.SUCCESS["200"],
                    })
                } else {
                    await auditLogsController.addLog(email, req.useragent, 'reset temporary password', ResponseTypes.ERROR["401"],
                        'user temporary and existing temporary password does not match');
                    res.status(401);
                    res.json({
                        message: ResponseTypes.ERROR["401"],
                        description: ResponseTypes.ERROR.MESSAGES.PASSWORD_RESET_FAILED
                    })
                }
            }
        } catch (error) {
            await auditLogsController.addLog(email, req.useragent, 'reset temporary password', ResponseTypes.ERROR["500"], error);
            res.status(500);
            res.json({
                description: ResponseTypes.ERROR["500"]
            })
        }

    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_ATTRIBUTE_BODY
        })
    }


}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.verifyActivationEmail = async (req, res) => {

    let uuidAndEmailPayload = req.params.uuid;
    const uuidAndEmailPayloadArray = uuidAndEmailPayload.split('&');
    const uuid = uuidAndEmailPayloadArray[0];
    const emailArray = uuidAndEmailPayloadArray[1].split('=');
    const email = emailArray[1];

    if (uuid && email) {
        try {
            logger.info('activation process begin')
            const user = await User.findOne({isEmailConfirmed: false}).byEmail(email);
            logger.info('unconfirmed email account identified')
            if (user) {
                if (await isSameUser(uuid, user.emailActivationToken)) {
                    if (await isSameUser(email, user.email)) {
                        user.isEmailConfirmed = true;
                        logger.info('setting isEmailConfirmed to true')
                        user.isAccountActive = true;
                        logger.info('setting isAccountActive to true')
                        user.save();
                        logger.info('activation process completed. Account updated')
                        res.status(200);
                        res.json({
                            message: ResponseTypes.SUCCESS["200"],
                        })
                    } else {
                        res.status(401);
                        res.json({
                            message: ResponseTypes.ERROR["401"],
                            description: ResponseTypes.ERROR.MESSAGES.EMAIL_VERIFICATION_FAILED
                        })
                    }
                } else {

                    res.status(401);
                    res.json({
                        message: ResponseTypes.ERROR["401"],
                        description: ResponseTypes.ERROR.MESSAGES.EMAIL_VERIFICATION_FAILED
                    })
                }
            } else {
                res.status(401);
                res.json({
                    message: ResponseTypes.ERROR["401"],
                    description: ResponseTypes.ERROR.MESSAGES.EMAIL_VERIFICATION_FAILED
                })
            }
        } catch (error) {
            res.status(500);
            res.json({
                description: ResponseTypes.ERROR["500"]
            })
        }
    } else {
        res.status(400);
        res.json({
            message: ResponseTypes.ERROR["400"],
            description: ResponseTypes.ERROR.MESSAGES.MISSING_REQUIRED_ATTRIBUTE_BODY
        })
    }
}

