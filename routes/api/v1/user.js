/**
 * Created by maryobikwelu on 2/26/20
 */

const express = require('express');
const router = express.Router();

const { checkJwt } = require('../../../middlewares/checkJwt');
const { checkAccountStatus } = require('../../../middlewares/checkAccountStatus');
const { authController }  = require('../../../controllers');

/**
 * *********************************POST*****************************************
 */

router.post('/register', authController.signUp);
router.post('/login', authController.signIn);


router.get('/activateAccount/:uuid',[checkJwt, checkAccountStatus], authController.verifyActivationEmail);

//router.post('/resetPassword/sendEmail', authController.nonAuthResetPasswordRequest);
//router.post('/resetPassword/passwordGate', authController.nonAuthResetPasswordPriorToLogin);


/**
 *  ***************************************** GET*************************************
 */
router.get('/myuser', [checkJwt, checkAccountStatus], authController.getUser);


/**
 *  ***************************************** GET*************************************
 */
router.patch('/unlock',  authController.unlock);

/**
 * *********************************PATCH*************************************
 */

router.patch('/', [checkJwt, checkAccountStatus], authController.updateUser);


module.exports = router;