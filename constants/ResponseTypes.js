

const ResponseTypes = {
    ERROR : {
        500: 'Something went wrong. Please try again later',
        501: 'Not implemented',
        400: 'Bad request. Please check your request',
        401: 'Your action was unauthorized',
        403: 'Forbidden',
        404: 'The specified resource was not found',
        405: 'Method not allowed',
        412: 'Precondition failed',
        MESSAGES: {
            ACCOUNT_EXISTS: 'A user with that email already exists',
            ACCOUNT_DOES_NOT_EXIST: 'Account does not exist',
            EMAIL_EXISTS: 'The email has already subscribed',
            INVALID_CREDENTIALS: 'Invalid credentials',
            EXPIRED_TOKEN: 'Expired token',
            INCORRECT_TOKEN_USED: 'Incorrect token used',
            UNIDENTIFIED_DOMAIN: 'Request is coming from an unidentified domain',
            USER_NOT_FOUND: 'User not found',
            MISSING_REQUIRED_PARAMETER_T_K_O: 'Missing required header parameters - one of these (Token, Key, Origin)',
            MISSING_REQUIRED_ATTRIBUTE_BODY: 'Missing required attribute/s in body of request',
            PASSWORD_RESET_FAILED: 'Password update failed',
            EMAIL_VERIFICATION_FAILED: 'Email verification failed',
            PROFILE_DOES_NOT_EXIST: 'The code profile does not exist'
        }
    },
    SUCCESS: {
        200 : 'Success',
        MESSAGES: {
            SUBSCRIPTION_PENDING: 'Thanks for signing up for Tally! Check your email inbox (or spam/junk) to find our invitation ',
            SUBSCRIPTION_SUCCESS: 'You have successfully confirmed your Tally subscription',
            REGISTRATION_CONFIRM: 'Welcome to Tally ',
            PASSWORD_RESET_INITIAL: 'You requested for a password change',
            TEMPORARY_PASSWORD_SENT: 'We have sent an email to you to help you reset your password',
            DAILY_NEWS: 'Your today news update specially delivered',
            SUBSCRIPTION_WELCOME: 'Welcome to Tally ',
            PASSWORD_GATE_REQUIRED: "new password required",
            TEMPORARY_PASSWORD_DETECTED: "user logged in with a temporary password"
        },
        BUSINESS_NOTIFICATION : {
            EMAIL_CONFIRMATION_STILL_PENDING: 'Your account is not yet verified. ' +
                'Please click the link to receive a new confirmation email'
        }
    }
}


module.exports = ResponseTypes;
