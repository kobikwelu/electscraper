const config = require('../config');
const axios = require('axios');
const API_URL = 'https://api.openai.com/v1/chat/completions';
const User = require('../models/User')
const FinancialProductGuide = require('../models/FinancialProductGuide')
const ProductGuidesMeta = require('../models/ProductGuidesMeta')
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
            logger.info('building advisory')
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
        res.status(400);
        res.json({
            message: "Missing required values"
        })
    }
};

exports.getLatestRecommendation = async (req, res) => {
    const email = req.headers['email'];


    if (email) {
        try {
            let recommendation = await FinancialRecommendation.findOne({
                email: email
            })
                .sort({timestamp: -1});
            res.status(200)
            res.send({
                recommendation
            })

        } catch (error) {
            logger.info(error)
            res.status(error.response?.status || 500).json({
                message: error.response?.statusText || 'Internal Server Error'
            });
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

const buildFinancialGuideWithMetaData = async() => {
    let guidesWithMeta
    try {
        const financialProductGuides = await FinancialProductGuide.find({}, '-_id');


            guidesWithMeta = await Promise.all(financialProductGuides.map(async (guide) => {
            const meta = await ProductGuidesMeta.findOne({business_name: guide.business_name})
                                                .select('_id -business_name -business_website')

            if (meta) {
                guide = guide.toObject(); // Convert the Mongoose document into a plain JavaScript object
                guide.meta = meta;
            }

            return guide;
        }));

        return guidesWithMeta;
    } catch (error) {
        console.error(error);
    }

}