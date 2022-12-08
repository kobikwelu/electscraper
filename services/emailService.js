
require('ejs');
const mg = require('mailgun-js');
const ResponseTypes = require('../constants/ResponseTypes');
let activationEmailTemplate = require('../views/activationEmailTemplate.ejs');
let resetPasswordEmailTemplate = require('../views/resetPasswordEmailTemplate.ejs');

const config = require('../config');
const keys = require('../config');

const {mailgunApiKey: apiKey, mailgunDomain: domain, mailgunSenderName: from} = config.mailgun;
const mailgun = mg({apiKey, domain});

/**
 *
 * @param user
 * @param payload
 * @returns {Promise<*>}
 */
exports.sendEmail = async (user, payload) => {
    logger.info('mailgun email start')
    let html;
    const {subject} = payload;
    const {email} = user;

    logger.info('user.email ' + email)
    logger.info('subject ' + subject)

    html = await buildEmailTemplate(user, payload);
    const emailParams = {
        to: email,
        subject: subject,
        html,
    };
    return send(emailParams);
};


const send = async (params) => {
    try{
        mailgun.messages().send({from, ...params})
    }catch(error){
        console.log(error)
    }
};


const buildEmailTemplate = async (user = null, payload, isBulkEmail = false) => {
    if (!isBulkEmail){
        const {subject, activationLink, temporaryPassword} = payload;
        const {name} = user;

        if (subject === ResponseTypes.SUCCESS.MESSAGES.SUBSCRIPTION_WELCOME) {
            return await activationEmailTemplate({activationLink, name});
        }
        if (subject === ResponseTypes.SUCCESS.MESSAGES.PASSWORD_RESET_INITIAL) {
            return await resetPasswordEmailTemplate({temporaryPassword, name})
        }
    } else {
        const {subject, primedDailyNews} = payload;
        if (subject === ResponseTypes.SUCCESS.MESSAGES.DAILY_NEWS) {
            return await dailyNewsDashboardEmailTemplate({primedDailyNews, keys})
        }
    }
}


exports.sendBulkEmail = async (users, payload) => {
    try {
        let html;
        const {subject} = payload;
        let mailingList =  await setupMailgunMailingList(users);
        html = await buildEmailTemplate(users, payload, true);
        const emailParams = {
            to: mailingList,
            subject: subject,
            html,
        };
        await send(emailParams);
    }catch(error){
        console.log(error)
    }
};


const setupMailgunMailingList = async (nigeriaStackSubscribedMembers)=>{
    try{
        await deleteExistingMailingList();
        await mailgun.post('/lists', {address: subscriberMailingList, description: 'Headcount mailing list'});
        await mailgun.lists(subscriberMailingList).members().add({
            members: nigeriaStackSubscribedMembers,
            subscribed: true
        });
        return subscriberMailingList;
    }catch(error){
        console.log(error)
    }
}

const deleteExistingMailingList = async ()=> {
    try {
        let list = await mailgun.lists(subscriberMailingList);
        if (list) {
            await list.delete();
        }
    } catch (error) {
        console.log(error)
    }
}