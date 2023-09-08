
const emailService = require('../services/emailService');

/**
 *
 * @param subscriber
 * @param payload - include whatever metadata you need.
 * Payload MUST CONTAIN NAME AND firstnax
 * @param isBulkEmail
 * @returns {Promise<void>}
 */
exports.sendEmailMessage = async (subscriber, payload, isBulkEmail = false) => {
    logger.info('email transaction start')
    try {
        if (isBulkEmail){
            await emailService.sendBulkEmail(subscriber, payload);
        }else {
            logger.info('individual email transaction start')
            await emailService.sendEmail(subscriber, payload);
            logger.info('individual email transaction completed')
        }
    } catch (error) {
        console.log(error);
    }
}