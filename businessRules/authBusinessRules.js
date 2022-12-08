const ResponseTypes = require('../constants/ResponseTypes');
const bcrypt = require('bcryptjs');

exports.applyLoginRules = async (user, password) => {
    let rulesReport = [];
    let rulesList = {
        ruleOne: await checkForBusinessErrors(user),
        ruleTwo: await performTemporaryPasswordCheck(user, password)
    };
    for (let rule in rulesList) {
        if (rulesList.hasOwnProperty(rule)) {
            if (rulesList[rule]) {
                rulesReport.push(rulesList[rule])
            }
        }
    }
    return rulesReport;
}


const checkForBusinessErrors = async (user) => {
    let businessError = null;
    const {showChangePasswordGate, temporaryPassword, disableAccount, isEmailConfirmed, isAccountActive} = user;
    if (showChangePasswordGate && temporaryPassword && disableAccount && isEmailConfirmed && isAccountActive) {
        businessError = ResponseTypes.SUCCESS.MESSAGES.PASSWORD_GATE_REQUIRED
    }
    return businessError;
}


const performTemporaryPasswordCheck = async (user, userLoggedInTemporaryPassword) => {
    let businessError = null;
    const {temporaryPassword} = user;
    if (temporaryPassword) {
        if (await bcrypt.compare(userLoggedInTemporaryPassword, temporaryPassword)) {
            businessError = ResponseTypes.SUCCESS.MESSAGES.TEMPORARY_PASSWORD_DETECTED
        } else {
            businessError = ResponseTypes.ERROR.MESSAGES.INVALID_CREDENTIALS
        }
    }
    return businessError
}