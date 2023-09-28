const config = require('../config');

const User = require('../models/User')
//const FinancialProductGuide = require('../models/FinancialProductGuide')
const FinancialProductGuideV2 = require('../models/FinancialProductGuideV2')
const ProductGuidesMeta = require('../models/ProductGuidesMeta')
const FinancialRecommendation = require('../models/FinancialRecommendation')
const financialAdvisoryKeywords = require('../constants/FinancialAdvisoryKeywords')


const AWS = require('aws-sdk');
AWS.config.update({
    region: 'us-west-1',
    accessKeyId: config.aws.AWS_KEY,
    secretAccessKey: config.aws.AWS_SECRET
});


exports.appListV2 = async (req, res) => {
    const key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
    const likeCount = await FinancialProductGuideV2.countDocuments({"group.likes": {$gt: 0}});
    const signupCount = await FinancialProductGuideV2.countDocuments({"group.signups": {$gt: 0}});
    const saveCount = await FinancialProductGuideV2.countDocuments({"group.saves": {$gt: 0}});
    const mostLikedPercentile = Math.ceil(likeCount * 0.20);  // Adjust this number to change the percentile
    const mostSignupsPercentile = Math.ceil(signupCount * 0.30);  // Adjust this number to change the percentile
    const mostSavesPercentile = Math.ceil(saveCount * 0.40);  // Adjust this number to change the percentile
    let result = {
        yourRecommendations: {},
        mostLiked: {},
        mostSignups: {},
        mostSaves: {},
        history: {
            saves: {},
            signups: {}
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
                result.yourRecommendations.advisory = recommendation.advisory
                recommendation.productList.forEach(product => {
                    appsHistory.push(product);
                });
            });
            let updatedAppsHistory = await updateAboutInAppsHistory(appsHistory)
            result.yourRecommendations.count = updatedAppsHistory.length
            result.yourRecommendations.appsHistory = updatedAppsHistory


//group likes
            const financialProductGuideV2LikesList = await FinancialProductGuideV2
                .find({"group.likes": {$gt: 0}})
                .select('-group.saves -group.signups -self.saves -self.signups')
                .sort({"group.likes": -1})
                .limit(mostLikedPercentile)
                .exec();


            result.mostLiked.count = financialProductGuideV2LikesList.length
            result.mostLiked.likesList = await buildFinancialGuideWithMetaDataV2(financialProductGuideV2LikesList, key)

//group signups
            const financialProductGuideV2SignupsList = await FinancialProductGuideV2
                .find({"group.signups": {$gt: 0}})
                .select('-group.saves -group.likes -self.saves -self.signups')
                .sort({"group.signups": -1})
                .limit(mostSignupsPercentile)
                .exec();


            result.mostSignups.count = financialProductGuideV2SignupsList.length
            result.mostSignups.signupsList = await buildFinancialGuideWithMetaDataV2(financialProductGuideV2SignupsList, key)

            //group saves
            const financialProductGuideV2SavesList = await FinancialProductGuideV2
                .find({"group.saves": {$gt: 0}})
                .select('-group.signups -group.likes -self.saves -self.signups')
                .sort({"group.saves": -1})
                .limit(mostSavesPercentile)
                .exec();


            result.mostSaves.count = financialProductGuideV2SavesList.length
            result.mostSaves.savesList = await buildFinancialGuideWithMetaDataV2(financialProductGuideV2SavesList, key)

            //self save
            let user =  await User.findOne({}).byEmail(key)
            const selfSaveList = user.appsHistory.filter(item => item.type === 'save');

            let enrichedSelfSaveList = await enrichUsersAppsHistory(selfSaveList)
            result.history.saves.count = enrichedSelfSaveList.length
            result.history.saves.selfSavesList = enrichedSelfSaveList

            //self signups
            const signupList = user.appsHistory.filter(item => item.type === 'signup');
            let enrichedSignupList = await enrichUsersAppsHistory(signupList)
            result.history.signups.count = enrichedSignupList.length
            result.history.signups.selfSignupList = enrichedSignupList


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

const buildFinancialGuideWithMetaDataV2 = async (financialProductGuidesV2, email) => {
    let guidesWithMeta = [];
    try {
        guidesWithMeta = await Promise.all(financialProductGuidesV2.map(async (guide) => {
            let meta = await ProductGuidesMeta.findOne({
                business_name: {$regex: new RegExp(`^${guide.business_name}$`, 'i')},
            })
                .select('_id -business_website')
                .lean();  // Adding .lean() here

            let guideWithMeta = guide.toObject(); // converting mongoose document to object

            if (meta) {
             let business_keywords = await returnItemFromRecommendation(meta, email)
                meta.leadership_team = await formatLeaderShipTeam(meta.leadership_team)
                guideWithMeta.meta = meta;
                guideWithMeta.business_keywords = business_keywords
            }


            // returning only the properties you need
            return {
                business_name: guideWithMeta.business_name,
                business_website: guideWithMeta.business_website,
                business_about: guideWithMeta.about,
                business_product_offerings: guideWithMeta.business_product_offerings,
                inbound_sign_in_url: guideWithMeta.inbound_sign_in_url,
                business_keywords: guideWithMeta.business_keywords,
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
    const urlRegex = /(http[s]?:\/\/[^\s]+)/;

    // While there is a match in the input string
    while ((match = regex.exec(input)) !== null) {
        const personString = match[1]; // Get the matched string

        // Extract the URL from the string
        const urlMatch = personString.match(urlRegex);

        let url = '';
        let nameTitleString = personString;

        // If a URL was found
        if (urlMatch !== null) {
            url = urlMatch[0];

            // Remove the URL from the personString
            nameTitleString = personString.replace(url, '').trim();
        }

        // Split name and title by '-'
        const nameTitleParts = nameTitleString.split('-').map(part => part.trim());
        const name = nameTitleParts[0] || '';
        let title = nameTitleParts.slice(1).join(' - ') || '';

        // Remove trailing hyphen from title
        title = title.replace(/\s-\s*$/, '');

        // Build the object
        let personObject = {
            name,
            title,
            link: url
        };

        // Add the object to the result array
        result.push(personObject);
    }

    return result;
}

const returnItemFromRecommendation = async (meta, email) => {
    let defaultKeywords = await returnRandomKeywords(financialAdvisoryKeywords, 5)
    try {
        let financialRecommendation = await FinancialRecommendation.findOne({
            $and: [
                {'productList.business_name': {$regex: new RegExp(`^${meta.business_name}$`, 'i')}},
                {email: email}
            ]
        });
        if (financialRecommendation) {
            let business = financialRecommendation.productList.find(product =>
                product.business_name.toLowerCase() === meta.business_name.toLowerCase()
            );

            if (business) {
               return business.business_keywords;
            } else{
                return defaultKeywords
            }
        } else{
            return defaultKeywords
        }
    } catch (error) {
        logger.error(error)
        return defaultKeywords
    }
}

const returnRandomKeywords = async (financialAdvisoryKeywords, number)=>{
    let keys = Object.keys(financialAdvisoryKeywords);
    let result = [];

    for(let i = 0; i < number; i++) {
        let randomKey = keys[Math.floor(Math.random() * keys.length)];
        result.push(financialAdvisoryKeywords[randomKey]);

        // Remove the used key from the array to avoid duplicates
        keys = keys.filter(key => key !== randomKey);
    }

    return result;
}

const updateAboutInAppsHistory = async (appsHistory) =>{
    // Create a new array to store the updated objects
    const updatedAppsHistory = [];

    for (let i = 0; i < appsHistory.length; i++) {
        const businessName = appsHistory[i].business_name;

        // Find the corresponding document in FinancialProductGuideV2 based on business_name
        const financialProduct = await FinancialProductGuideV2.findOne({ business_name: businessName });

        // If a corresponding document is found, update the about field
        if (financialProduct) {
            appsHistory[i].about = financialProduct.business_about;
            appsHistory[i].logo = financialProduct.logo;
        }

        // Add the updated object to the new array
        updatedAppsHistory.push(appsHistory[i]);
    }

    // Return the updated array
    return updatedAppsHistory;
}

const enrichUsersAppsHistory = async (appsHistory)=>{
    // Create a new array to store the updated objects
    const updatedAppsHistory = [];

    // Iterate over each app in appsHistory
    for (let i = 0; i < appsHistory.length; i++) {
        const businessName = appsHistory[i].app.business_name;

        // Find the corresponding document in FinancialProductGuideV2 based on business_name
        const financialProduct = await FinancialProductGuideV2.findOne({ business_name: businessName });

        // If a corresponding document is found, update the about and logo fields
        if (financialProduct) {
            appsHistory[i].app.about = financialProduct.business_about;
            appsHistory[i].app.logo = financialProduct.logo;
        } else {
            console.log(`No matching document found for business_name: ${businessName}`);
        }

        // Add the updated object to the new array
        updatedAppsHistory.push(appsHistory[i]);
    }

    // Return the updated array
    return updatedAppsHistory;
}

