const config = require('../config');
const axios = require('axios');
const API_URL = 'https://api.openai.com/v1/chat/completions';
const User = require('../models/User')
const FinancialProductGuide = require('../models/FinancialProductGuide')
const FinancialRecommendation = require('../models/FinancialRecommendation')
const DefaultRecommendation = require('../constants/DefaultRecommendation')
const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-west-1',
    accessKeyId: config.aws.AWS_KEY,
    secretAccessKey: config.aws.AWS_SECRET
});

const sqs = new AWS.SQS();
const queueUrl = config.sqs.sqs_url

exports.recommendation = async (req, res) => {
    const email = req.body.email;
    const user = await User.findOne({}).byEmail(email);
    if (email) {
        if (user.profile.isNewAdvisoryNeeded) {
            logger.info('new advisory is needed')
            try {

                let listOfFinancialProducts = await batchFinancialProducts(FinancialProductGuide)
                const params = {
                    MessageBody: JSON.stringify({
                        user,
                        productsToProcess: listOfFinancialProducts
                    }), // message should be a String
                    QueueUrl: queueUrl,
                    MessageGroupId: 'tally-recommendation',
                    MessageDeduplicationId: `${email}chatgptadvisory`
                };
                const response = await sqs.sendMessage(params).promise();
                logger.info(`Message ${response.MessageId} enqueued successfully.`);
                let recommendation = DefaultRecommendation.recommendation
                if (recommendation) {
                    logger.info('advisory created ')
                    logger.info('saving to cache')
                    let advisoryKey = email + 'chatgptadvisory'
                    await redisClient.set(advisoryKey, JSON.stringify(recommendation), {
                        ex: 120,
                        NX: true
                    })
                    logger.info('cache write successful')
                    user.profile.isNewAdvisoryNeeded = false
                    await user.save();
                    logger.info('updated advisory flag')
                    res.status(200);
                    res.json({
                        recommendation,
                        message: 'While we curate your personalized app recommendations, ' +
                            'please browse these sponsored options that might interest you. ' +
                            'Your unique selection will be ready in a jiffy - thank you for your patience! '
                    })
                } else {
                    res.status(500);
                    res.json({
                        message: 'We cannot process your request for now'
                    })
                }

            } catch (error) {
                logger.info(error)
                res.status(error.response?.status || 500).json({
                    message: error.response?.statusText || 'Internal Server Error'
                });
            }
        } else {
            let cachedRecommendation;
            logger.info(' item already exists. Lets retrieve from cache')
            let advisorKey = email + 'chatgptadvisory'
            const cacheResults = await redisClient.get(advisorKey);
            if (cacheResults) {
                cachedRecommendation = JSON.parse(cacheResults);
            } else{
                cachedRecommendation = []
                //TODO - This assumes the cache is down or was inadvertedly wiped out
                //Goal will be up update the advisory flag and retrigger the recommendation
                //flow to enable a new set of advisory to be seeded in the DB and cache
            }
            logger.info(`pulling item from the advisory cache`)
            res.status(200)
            res.send({
                recommendation: cachedRecommendation
            })
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }
};

exports.appList = async (req, res) => {
   const email = req.headers['email']

    if (email) {
        try {
            const financialRecommendationsList = await FinancialRecommendation.find({}).byEmail(email).sort({timestamp: -1});
            let appsHistory = []

            financialRecommendationsList.forEach(recommendation => {
                recommendation.advisoryList.forEach(advisory => {
                    appsHistory.push(...advisory.productsList);
                });
            });

            res.status(200)
            res.send({
                appsHistory
            })
        }catch(error){
            logger.error(error)
            res.status(500)
            res.send({
                message: 'something went wrong'
            })
        }

    } else {
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }
};

const getFinancialAdvice = async (messages) => {
    try {
        const payload = {
            messages: messages,
            max_tokens: 800,
            n: 1,
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
        };

        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.openAi.API_KEY}`,
            },
        };

        const response = await axios.post(API_URL, payload, requestOptions);
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        logger.info(error)
    }
};

const primeResponse = async (advice) => {
    try {
        const indexOfOpeningBracket = advice.indexOf('[');
        const indexOfClosingBracket = advice.lastIndexOf(']');
        const advisory = advice.slice(0, indexOfOpeningBracket);
        const rawProducts = advice.slice(indexOfOpeningBracket, indexOfClosingBracket + 1);

        const productsList = JSON.parse(rawProducts);

        return {advisory, productsList};
    } catch (error) {
        return null
    }
}

const batchFinancialProducts_deprecated = async (model) => {
    const resultSet = [];
    try {
        const totalRecords = await model.countDocuments({});
        const minRecordsPerSet = 6;
        const numSets = Math.ceil(totalRecords / minRecordsPerSet);


        for (let i = 0; i < numSets; i++) {
            const records = await model.aggregate([
                {$skip: i * minRecordsPerSet},
                {$limit: minRecordsPerSet}
            ]);

            resultSet.push(records);
        }

        return resultSet
    } catch (error) {
        console.error('Error:', error);
    }
}

const batchFinancialProducts = async (model) => {
    const resultSet = [];
    try {
        const totalRecords = await model.countDocuments({});
        const recordsPerBatch = 6;
        const numBatches = Math.ceil(totalRecords / recordsPerBatch);
        const seenIds = [];

        for (let i = 0; i < numBatches; i++) {
            const records = await model.aggregate([
                {$match: {_id: {$nin: seenIds}}},
                {$sample: {size: recordsPerBatch}},
                {$limit: recordsPerBatch}
            ]);

            records.forEach(record => {
                seenIds.push(record._id);
            });

            resultSet.push(records);
        }

        return resultSet;
    } catch (error) {
        console.error('Error:', error);
    }
}


exports.interactWithChatGPTKnowledgeBase = async (user, productSet) => {
    logger.info('interaction with FinancialRecommendation engine started')
    const messages = [
        {
            role: "system",
            content: `You are a helpful Financial advisor based in Nigeria (consider all the social, financial and economic nuances of Nigeria and its impact on the average Nigerian) that suggests financial strategies based on a financial set of products/apps listed in this array: ${JSON.stringify(productSet)}`,
        },
        {
            role: "user",
            content: `A set of questions and answers which should help you get a better understanding of my needs are contained in this array: ${JSON.stringify(user.profile.financialQuestionnaires)}`,
        },
        {
            role: "user",
            content: `Carefully analyze my needs by analyzing my preferences against the list of financial products which I provided you. 
                        Ensure that you provide a brief recommendation of 3 products which helps the user (Financial analysis), how each product compliments the other products on your list. At the end, list all the recommended 
                        products you selected in this format inbound_sign_in_url, business_website, outbound_business_app, about, logo and business keywords in an array format.`,
        },
    ];
    return await primeResponse(await getFinancialAdvice(messages));
}

const processRecommendations = async (user, productsToProcess) => {
    logger.info('workers spin off process to process pending set of recommendations')
    try {
        await recommendationsQueue.add({
            user: user,
            productsToProcess: productsToProcess
        });
    } catch (error) {
        logger.error(error)
    }
}