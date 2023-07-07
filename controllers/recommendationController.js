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
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    const likeCount = await FinancialProductGuide.countDocuments({"group.likes": {$gt: 0}});
    const signupCount = await FinancialProductGuide.countDocuments({"group.signups": {$gt: 0}});
    const saveCount = await FinancialProductGuide.countDocuments({"group.saves": {$gt: 0}});
    const mostLikedPercentile = Math.ceil(likeCount * 0.20);  // Adjust this number to change the percentile
    const mostSignupsPercentile = Math.ceil(signupCount * 0.30);  // Adjust this number to change the percentile
    const mostSavesPercentile = Math.ceil(saveCount * 0.40);  // Adjust this number to change the percentile
    let result = {
        yourRecommendations: {},
        mostLiked: {},
        mostSignups: {},
        mostSaves:{},
        history:{
            saves:{},
            signups:{}
        }
    }

    if (key) {
        try {
            const financialRecommendationsList = await FinancialRecommendation
                .find({email: key})
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

//group likes
            const financialProductGuideLikesList = await FinancialProductGuide
                .find({"group.likes": {$gt: 0}})
                .select('-group.saves -group.signups -self.saves -self.signups')
                .sort({"group.likes": -1})
                .limit(mostLikedPercentile)
                .exec();


            result.mostLiked.count = financialProductGuideLikesList.length
            result.mostLiked.likesList = await buildFinancialGuideWithMetaData(financialProductGuideLikesList)

//group signups
            const financialProductGuideSignupsList = await FinancialProductGuide
                .find({"group.signups": {$gt: 0}})
                .select('-group.saves -group.likes -self.saves -self.signups')
                .sort({"group.signups": -1})
                .limit(mostSignupsPercentile)
                .exec();



            result.mostSignups.count = financialProductGuideSignupsList.length
            result.mostSignups.signupsList = await buildFinancialGuideWithMetaData(financialProductGuideSignupsList)

            //group saves
            const financialProductGuideSavesList = await FinancialProductGuide
                .find({"group.saves": {$gt: 0}})
                .select('-group.signups -group.likes -self.saves -self.signups')
                .sort({"group.saves": -1})
                .limit(mostSavesPercentile)
                .exec();


            result.mostSaves.count = financialProductGuideSavesList.length
            result.mostSaves.savesList = await buildFinancialGuideWithMetaData(financialProductGuideSavesList)

            //self saves
            const financialProductGuideSelfSavesList = await FinancialProductGuide
                .find({"self.saves": {$gt: 0}})
                .select('-group.signups -group.likes -group.saves -self.signups')
                .sort({"self.saves": -1})
                .limit(mostSavesPercentile)
                .exec();

            result.history.saves.count = financialProductGuideSelfSavesList.length
            result.history.saves.selfSavesList = await buildFinancialGuideWithMetaData(financialProductGuideSelfSavesList)

            //self signups

            const financialProductGuideSelfSignupList = await FinancialProductGuide
                .find({"self.signups": {$gt: 0}})
                .select('-group.signups -group.likes -group.saves -self.saves')
                .sort({"self.signups": -1})
                .limit(mostSavesPercentile)
                .exec();

            result.history.signups.count = financialProductGuideSelfSignupList.length
            result.history.signups.selfSignupList = await buildFinancialGuideWithMetaData(financialProductGuideSelfSignupList)

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
    const {business_name, action, actionGroup} = req.body; // actionGroup is either 'group' or 'self'
    const allowedKeys = [
        'likes',
        'saves',
        'signups'
    ];
    const allowedGroups = [
        'group',
        'self'
    ];
    if (business_name && action && actionGroup && allowedKeys.includes(action) && allowedGroups.includes(actionGroup)) {
        logger.info('has required information')

        try {
            const financialProduct = await FinancialProductGuide.findOne({business_name});
            if (!financialProduct) {
                res.status(404).json({
                    message: "Missing required values"
                });
            }
            // increment the corresponding attribute
            financialProduct[actionGroup][action] += 1;
            logger.info('updating action')
            await financialProduct.save();
            logger.info('action logged successfully')
            res.status(200).json({
                message: "success"
            });
        } catch (error) {
            logger.error(error)
            res.status(500).json({
                message: "something went wrong"
            });
        }
    } else {
        res.status(400).json({
            message: "Missing required values or action must be one of likes | saves | signups and actionGroup must be one of group | self"
        })
    }
}


const buildFinancialGuideWithMetaData = async(financialProductGuides) => {
    let guidesWithMeta = [];
    logger.info('building started')
    try {
        guidesWithMeta = await Promise.all(financialProductGuides.map(async (guide) => {
            let meta = await ProductGuidesMeta.findOne({
                business_name: { $regex: new RegExp(`^${guide.business_name}$`, 'i') },
            })
                .select('_id -business_name -business_website')
                .lean();  // Adding .lean() here

            let guideWithMeta = guide.toObject(); // converting mongoose document to object

            if (meta) {
                meta.leadership_team = await formatLeaderShipTeam(meta.leadership_team)
                guideWithMeta.meta = meta;
            }

            // returning only the properties you need
            return {
                likes: guideWithMeta.likes,
                business_name: guideWithMeta.business_name,
                business_website: guideWithMeta.business_website,
                business_product_offerings: guideWithMeta.business_product_offerings,
                inbound_sign_in_url: guideWithMeta.inbound_sign_in_url,
                outbound_apple_store: guideWithMeta.outbound_apple_store,
                outbound_google_play_store: guideWithMeta.outbound_google_play_store,
                logo: guideWithMeta.logo,
                meta: guideWithMeta.meta,
            };
        }));

        return guidesWithMeta;

    } catch (error) {
        logger.error(error);
        return null
    }
}

const formatLeaderShipTeam = async (input)=>{
    // Regular expression to match each item enclosed in brackets
    const regex = /\[([^\]]+)\]/g;

    let match;
    let result = [];

    // Regular expression to match the URL in each item
    const urlRegex = /(http[s]?:\/\/[^ ]+)/;

    // While there is a match in the input string
    while ((match = regex.exec(input)) !== null) {
        const personString = match[1]; // Get the matched string

        // Extract the URL from the string
        const urlMatch = personString.match(urlRegex);

        // If a URL was found
        if (urlMatch !== null) {
            const url = urlMatch[0];

            // Remove the URL from the personString
            const name = personString.replace(url, '').trim();

            // Build the object
            let personObject = {
                name,
                link: url
            };

            // Add the object to the result array
            result.push(personObject);
        } else {
            // If there was no URL, treat the entire string as the name
            result.push({
                name: personString.trim(),
                link: ''
            });
        }
    }

    return result;
}
