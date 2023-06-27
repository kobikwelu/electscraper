const config = require('../config');
const axios = require('axios');
const API_URL = 'https://api.openai.com/v1/chat/completions';
const User = require('../models/User')
const FinancialProductGuide = require('../models/FinancialProductGuide')
const FinancialRecommendation = require('../models/FinancialRecommendation')
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
    const financialProductGuides = await FinancialProductGuide.find({}, '-_id');
    if (email) {
        if (user.profile.isNewAdvisoryNeeded) {
            logger.info('new advisory is needed')
            try {

                const params = {
                    MessageBody: JSON.stringify({
                        user,
                        productsToProcess: financialProductGuides
                    }), // message should be a String
                    QueueUrl: queueUrl,
                    MessageGroupId: 'tally-recommendation',
                    MessageDeduplicationId: `${email}chatgptadvisory`
                };
                const response = await sqs.sendMessage(params).promise();
                logger.info(`Message ${response.MessageId} enqueued successfully.`);
                /*  user.profile.isNewAdvisoryNeeded = false
                  await user.save();
                  logger.info('updated advisory flag') */
                res.status(200);
                res.json({
                    ads: [
                        {
                            business_name: "GoDaddy",
                            business_website: "https://godaddy.com/",
                        },
                        {
                            business_name: "Meta",
                            business_website: "https://meta.com/",
                        }
                    ],
                    message: 'While we curate your personalized app recommendations, ' +
                        'please browse these sponsored options that might interest you. ' +
                        'Your unique selection will be ready in a jiffy - thank you for your patience! '
                })
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
            } else {
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
    const count = await FinancialProductGuide.countDocuments({likes: {$gt: 0}});
    const mostLikedPercentile = Math.ceil(count * 0.60);  // Adjust this number to change the percentile
    const mostSignupsPercentile = Math.ceil(count * 0.30);  // Adjust this number to change the percentile
    let result = {
        yourRecommendations: {},
        mostLiked: {},
        mostSignups: {}
    }

    if (email) {
        try {
            const financialRecommendationsList = await FinancialRecommendation
                .find({email: email})
                .sort({timestamp: -1})
                .exec();

            let appsHistory = []

            financialRecommendationsList.forEach(recommendation => {
                recommendation.productList.forEach(product => {
                    appsHistory.push(product);
                });
            });
            result.yourRecommendations.count = appsHistory.length
            result.yourRecommendations.appsHistory = appsHistory


            const financialProductGuideLikesList = await FinancialProductGuide
                .find({likes: {$gt: 0}})
                .select('-saves -signups')
                .sort({likes: -1})
                .limit(mostLikedPercentile)
                .exec();


            result.mostLiked.count = financialProductGuideLikesList.length
            result.mostLiked.likesList = financialProductGuideLikesList

            const financialProductGuideSignupsList = await FinancialProductGuide
                .find({signups: {$gt: 0}})
                .select('-saves -likes')
                .sort({signups: -1})
                .limit(mostSignupsPercentile)
                .exec();

            result.mostSignups.count = financialProductGuideSignupsList.length
            result.mostSignups.signupsList = financialProductGuideSignupsList

            res.status(200)
            res.send({
                result
            })
        } catch (error) {
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

exports.trackUserInteractions = async (req, res) => {
    const {business_name, action} = req.body;
    const allowedKeys = [
        'likes',
        'saves',
        'signups'
    ];
    if (business_name && action && allowedKeys.includes(action)) {
        logger.info('has required information')

        try {
            const financialProduct = await FinancialProductGuide.findOne({business_name});
            if (!financialProduct) {
                res.status(404);
                res.json({
                    message: "Missing required values"
                });
            }
            // increment the corresponding attribute
            financialProduct[action] += 1;
            logger.info('updating action')
            await financialProduct.save();
            logger.info('action logged successfully')
            res.status(200);
            res.json({
                message: "success"
            });
        } catch (error) {
            logger.error(error)
            res.status(500);
            res.json({
                message: "something went wrong"
            });
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values or action must be one of likes | saves | signups"
        })
    }
}