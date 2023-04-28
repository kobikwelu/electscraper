const bcrypt = require('bcryptjs');
const uuid = require('uuid/v4');
let jwt = require('jwt-simple');
const password = require('generate-password');

const ResponseTypes = require('../constants/ResponseTypes');
const AccountTierTypes = require('../constants/AccountTierTypes');
const configs = require(`../config/env/${process.env.NODE_ENV}`);
const config = require("../config");
const fs = require('fs');
const {
    basic_unregistered: basic_unregistered,
    basic_registered: basic_registered,
    team: team,
    enterprise: enterprise
} = config.accountTier;

const User = require('../models/User');
const {authBusinessRules} = require('../businessRules')


const notificationController = require('../controllers/notificationController');

const keys = require('../config');



const SALT_ROUNDS = 10;
const MILLISECONDS = 60000;


const genToken = async (role, username, email) => {
    let origin
    logger.info('gen token starts')
    if (process.env.NODE_ENV === 'production') {
        //TODO - Temporal bridge to allow for remote development. MST REVERT TO LINE BELOW
        //origin = `${keys.Origin_frontend}`;
        origin = "http://localhost:3000"
    } else {
        origin = "http://localhost:3000"
    }
    let expiresAt = await expiresInV3(1440);
    let issuedAt = await getCurrentTimeV2();
    let token = jwt.encode({
        //TODO: issuer/request (origin) source must be added for extra security
        //issuer   : "http://localhost:8080",
        issuer: origin,
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
        logger.info(error)
        if (error.message === 'Signature verification failed'){
            return ResponseTypes.ERROR["400"]
        } else{
            return ResponseTypes.ERROR["500"]
        }
    }
}

/**
 *
 * @param key
 * @returns {Promise<string|null>}
 */
exports.getAccountState = async (key) => {
    let error
    try {
        const user = await User.findOne({}).byEmail(key);
        const {accountState, isEmailConfirmed} = user;
        if (isEmailConfirmed && (!accountState.disabled.isDisabled)) {
            logger.info('account is confirmed and is not disabled. Proceeding past second middleware check')
            error = {
                code: '',
                description: ''
            }
        } else {
            if (accountState.disabled.isDisabled) {
                logger.info('account is  disabled')
                error = accountState.disabled.reasons[0]
            } else {
                logger.info('account is not yet confirmed')
                error = {
                    code: 'EMAIL_PENDING',
                    description: ResponseTypes.SUCCESS.BUSINESS_NOTIFICATION.EMAIL_CONFIRMATION_STILL_PENDING
                }
            }
        }
    } catch (error) {
        return ResponseTypes.ERROR["500"]
    }
    return error
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
        //TODO - Adding a bridge to allow for remote development. MUST REVERT TO LINE BELOW
        //return issuer === origin
        return true
    }
}

/**
 *
 * @param email
 * @param key
 * @returns {Promise<boolean>}
 */
const isSameUser = async (email, key) => {
    logger.info('email is ' + email)
    logger.info('key is ' + key)
    return email === key
}

/**
 *
 * @param typeOfKey
 * @returns {Promise<string|*>}
 */
const getSigningKey = async (typeOfKey) => {
    if (process.env.NODE_ENV === 'production') {
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
    const {email, role, password, name, financialQuestionnaires} = req.body;
    const unHashedPassword = password;

    if (email && role && unHashedPassword && name && financialQuestionnaires) {
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
                let profile = {
                    address: null,
                    zipcode: null,
                    phoneNumber: null,
                    profileImageUrl: null,
                    bioInfo: null,
                    dateOfBirth: null,
                    financialQuestionnaires: financialQuestionnaires,
                    comments: []
                }
                user = await User.create({
                    email,
                    password,
                    name,
                    role,
                    profile,
                    tier: 'BASIC_UNREGISTERED',
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
            if (user) {
                await deleteUser(user.email);
            }
            if (error._message === 'User validation failed') {
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
                if (rulesReportArray.indexOf('Invalid credentials') !== -1) {
                    res.status(401);
                    res.json({
                        message: ResponseTypes.ERROR["401"],
                        description: ResponseTypes.ERROR.MESSAGES.INVALID_CREDENTIALS
                    })
                } else {
                    let tokenPreAccessChecks = await this.buildCaseForAccess(user)
                    if (rulesReportArray.length === 0) {
                        logger.info('')
                        const doesMatch = await bcrypt.compare(password, user.password);
                        if (doesMatch) {
                            if (tokenPreAccessChecks.meta.durationSinceLastAccess > 24.00000) {
                                await this.unlockAccountBasedOnElapsedTimeLimit(tokenPreAccessChecks, user)
                            }
                            logger.info('sign in - checking if account is disabled ')
                            if (!user.accountState.disabled.isDisabled) {
                                logger.info('account is not disabled ')
                                if (tokenPreAccessChecks.isRequestGranted) {
                                    logger.info('token request is granted')
                                    user.lastCheckInTime = new Date();
                                    user.markModified('lastCheckInTime');
                                    if (tokenPreAccessChecks.meta.durationSinceLastAccess > 24.0000) {
                                        logger.info(`its been ${tokenPreAccessChecks.meta.durationSinceLastAccess} hours since token was last issued`)
                                        user.dailyCounter = 0
                                    } else {
                                        user.dailyCounter = user.dailyCounter + 1
                                    }
                                    await user.save();
                                    logger.info('latest user state updated')
                                    logger.info('issuing token')
                                    res.json({
                                        message: ResponseTypes.SUCCESS["200"],
                                        payload: await genToken(user.role, user.username, user.email),
                                        isEmailConfirmed: user.isEmailConfirmed
                                    })
                                } else {
                                    logger.info('token request is denied')
                                    user.accountState.disabled.isDisabled = true
                                    user.accountState.disabled.reasons.push({
                                        code: tokenPreAccessChecks.meta.disableReason.code,
                                        description: tokenPreAccessChecks.meta.disableReason.description
                                    })
                                    await user.save();
                                    res.json({
                                        message: ResponseTypes.SUCCESS["200"],
                                        businessError: {
                                            tokenAccess: tokenPreAccessChecks.isRequestGranted,
                                            accountState: tokenPreAccessChecks.meta.accountState,
                                            message: tokenPreAccessChecks.meta.message
                                        }
                                    })
                                }
                            } else {
                                logger.info('account is disabled...checking reason')
                                if (user.accountState.disabled.reasons[0].code === 'ACCOUNT_LIMIT') {
                                    logger.info('account is disabled...for ACCOUNT_LIMIT')
                                    let errorMessage
                                    if (user.tier === AccountTierTypes.BASIC_UNREGISTERED) {
                                        errorMessage = 'please activate your account to continue access'
                                    } else {
                                        errorMessage = 'please upgrade your account to continue access'
                                    }
                                    res.json({
                                        message: ResponseTypes.SUCCESS["200"],
                                        businessError: {
                                            tokenAccess: false,
                                            accountState: `over the limit for account ${user.email}`,
                                            message: errorMessage
                                        }
                                    })
                                } else {
                                    logger.info('account is disabled...for OTHER reasons')
                                    res.json({
                                        message: ResponseTypes.SUCCESS["200"],
                                        businessError: {
                                            tokenAccess: false,
                                            accountState: 'Account is disabled',
                                            message: 'reach us at account@tallyng.com to unlock your account'
                                        }
                                    })
                                }
                            }

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

exports.unlockAccountBasedOnElapsedTimeLimit = async (tokenPreAccessChecks, user) => {
    logger.info('checking if the account should be unlocked ')
    user.dailyCounter = 0
    user.accountState.disabled.isDisabled = false
    user.accountState.disabled.reasons = []
    await user.save()
    logger.info('unlocking the account as it has passed the 24 hour cap limit')
    tokenPreAccessChecks.meta.accountState = ''
    tokenPreAccessChecks.meta.disableReason.code = '';
    tokenPreAccessChecks.meta.disableReason.description = '';
    tokenPreAccessChecks.isRequestGranted = true
    logger.info('updating tokenPreAccessCheck to reflect latest state of token access')
}

exports.buildCaseForAccess = async (user) => {
    let tokenPreAccessChecks = {
        isRequestGranted: true,
        meta: {
            accountState: '',
            message: '',
            durationSinceLastAccess: '',
            disableReason: {
                code: '',
                description: ''
            }
        }
    }

    let currentDateStamp = new Date();
    let tierThreshold;
    const {lastCheckInTime, tier, dailyCounter, email} = user
    let duration = Math.floor(currentDateStamp - lastCheckInTime) / (60 * 60 * 1000)

    if (tier === AccountTierTypes.BASIC_UNREGISTERED) {
        tierThreshold = basic_unregistered
    } else if (tier === AccountTierTypes.BASIC_REGISTERED) {
        tierThreshold = basic_registered
    } else if (tier === AccountTierTypes.TEAM) {
        tierThreshold = team
    } else if (tier === AccountTierTypes.ENTERPRISE) {
        tierThreshold = enterprise
    }

    if (dailyCounter < tierThreshold || dailyCounter === tierThreshold) {
        logger.info('accessChecks - account is not over the basic limit')
        tokenPreAccessChecks.meta.durationSinceLastAccess = duration;
    } else if (dailyCounter > tierThreshold) {
        logger.info('account is over the basic limit')
        logger.info('starting deep-dive to determine account tier eligibility')
        if (await isAccountOverTheLimit(tier, duration, dailyCounter)) {
            logger.info(`request is confirmed to be over the limit for ${tier} tier`)
            tokenPreAccessChecks.meta.accountState = `over the limit for account ${email}.`
            tokenPreAccessChecks.meta.durationSinceLastAccess = duration;
            tokenPreAccessChecks.meta.disableReason.code = 'ACCOUNT_LIMIT';
            tokenPreAccessChecks.meta.disableReason.description = 'Account limit exceeded';
            tokenPreAccessChecks.isRequestGranted = false
            if (tier === AccountTierTypes.BASIC_UNREGISTERED) {
                tokenPreAccessChecks.meta.message = 'please activate your account to continue access'
            } else {
                tokenPreAccessChecks.meta.message = 'please upgrade your account to continue access'
            }
            logger.info('setting up business errors')
        }
    }
    return tokenPreAccessChecks
}

const isAccountOverTheLimit = async (accountTier, duration, dailyCounter) => {
    logger.info('business rule eligibility check start - based on tier')
    let isAccountOverTheLimit = false
    if (accountTier === AccountTierTypes.BASIC_UNREGISTERED) {
        if (duration < 24 && dailyCounter > basic_unregistered) {
            isAccountOverTheLimit = true
        }
    }
    if (accountTier === AccountTierTypes.BASIC_REGISTERED) {
        if (duration < 24 && dailyCounter > basic_registered) {
            isAccountOverTheLimit = true
        }
    }
    if (accountTier === AccountTierTypes.TEAM) {
        if (duration < 24 && dailyCounter > team) {
            isAccountOverTheLimit = true
        }
    }
    if (accountTier === AccountTierTypes.ENTERPRISE) {
        if (duration < 24 && dailyCounter > enterprise) {
            isAccountOverTheLimit = true
        }
    }
    logger.info('business rule eligibility check completed - based on tier')
    return isAccountOverTheLimit
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
            res.status(401);
            res.json({
                description: ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND
            })
        } else {
            res.status(200);
            res.json({
                message: ResponseTypes.SUCCESS["200"],
                user: {
                    _id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    subscriptionPlan: user.subscriptionPlan,
                    isEmailConfirmed: user.isEmailConfirmed,
                    lastCheckInTime: user.lastCheckInTime,
                    registrationDate: user.registrationDate,
                    profile: user.profile,
                    tier: user.tier,
                    accountState: user.accountState
                }
            })
        }
    } catch (error) {
        res.status(500);
        res.json({
            message: ResponseTypes.ERROR["500"]
        })
    }

}

/**
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.unlock = async (req, res) => {
    try {
        let user;
        const email = req.body.email;
        user = await User.findOne({}).byEmail(email);
        if (user === null) {
            res.status(401);
            res.json({
                description: ResponseTypes.ERROR.MESSAGES.USER_NOT_FOUND
            })
        } else {
            logger.info(`checking if ${user.email} is locked`)
            if (user.accountState.disabled.isDisabled === true) {
                logger.info(`${user.email} is locked due to ${user.accountState.disabled.reasons[0].code}`)
                logger.info('setting isDisabled = false')
                user.accountState.disabled.isDisabled = false
                logger.info('setting reasons = []')
                user.accountState.disabled.reasons = []
                logger.info('resetting daily counter to 0')
                user.dailyCounter = 0
                await user.save()
                logger.info('account unlocked successfully')
            }
            res.status(200);
            res.json({
                message: 'Completed',
            })
        }
    } catch (error) {
        res.status(500);
        res.json({
            message: ResponseTypes.ERROR["500"]
        })
    }

}


/**
 * Internal methods
 * @param user
 * @param reason
 * @returns {Promise<void>}
 */
exports.lock = async (user, reason) => {
    logger.info(`starting locking process fpr ${user.email}`)
    logger.info('setting isDisabled = true')
    user.accountState.disabled.isDisabled = true
    logger.info('setting reasons = true')
    user.accountState.disabled.reasons = reason
    await user.save()
    logger.info('account locked complete')
}

/**
 *key -> user email
 * @param req
 * @param res
 * @returns {Promise<void>}
 *!
 **/

/**
 *  tier - must be one of the following TEAM | ENTERPRISE
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.updateUser = async (req, res) => {
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    let user = null;
    let purgeAdvisoryCache = false
    const allowedKeys = [
        'name',
        'profileImageUrl',
        'bioInfo',
        'address',
        'tier',
        'financialQuestionnaires',
        'isNewAdvisoryNeeded'
    ];
    try {
        const user = await User.findOne({}).byEmail(key);
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
                        if (user.profile[key] === 'isNewAdvisoryNeeded') {
                            purgeAdvisoryCache = true
                            //TODO - Future enhancement -The goal is to have a new chatgpt request sent offline
                            //This should be sent to a message queue for processing. Once completed
                            //Update the flag to false and send a notification.
                            //For now, we will defer and request new chat request on demand when the recommendation endpoint is called
                        }
                        user.profile[key] = value;
                    }
                }
            });
        }
        logger.info('saving profile changes in sor')
        await user.save();
        logger.info('profile successfully updated')
        if (purgeAdvisoryCache){
            logger.info('new profile update was requested with new questionnaires')
            logger.info('purging cache of old advisory')
            await redisClient.del(key)
            logger.info('purging completed')
        }
        res.status(200);
        res.json({
            description: ResponseTypes.SUCCESS["200"]
        })
    } catch (error) {
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
                        user.tier = 'BASIC_REGISTERED'
                        logger.info('setting tier to basic_registered')
                        if (user.accountState.disabled.isDisabled && user.accountState.disabled.reasons[0].code === 'ACCOUNT_LIMIT') {
                            logger.info('account was locked due to limit on pre-activated account')
                            logger.info('unlocking and resetting counter')
                            user.accountState.disabled.isDisabled = false;
                            user.accountState.disabled.reasons = []
                            user.dailyCounter = 0
                        }
                        await user.save();
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

