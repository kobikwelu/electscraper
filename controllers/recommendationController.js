const config = require('../config');
const axios = require('axios');
const API_URL = 'https://api.openai.com/v1/chat/completions';
const User = require('../models/User')
const FinancialProductGuide = require('../models/FinancialProductGuide')


exports.recommendation = async (req, res) => {
    const email = req.body.email;
    const user = await User.findOne({}).byEmail(email);

    if (email) {
        if (user.profile.isNewAdvisoryNeeded) {
            logger.info('new advisory is needed')
            try {
                const financialProductGuide = await FinancialProductGuide.find({})
                const messages = [
                    {
                        role: "system",
                        content: `You are a helpful Financial advisor based in Nigeria (consider all the social, financial and economic nuances of Nigeria and its impact on the average Nigerian) that suggests financial strategies based on a financial set of products/apps listed in this array: ${JSON.stringify(financialProductGuide)}`,
                    },
                    {
                        role: "user",
                        content: `A set of questions and answers which should help you get a better understanding of my needs are contained in this array: ${JSON.stringify(user.profile.financialQuestionnaires)}`,
                    },
                    {
                        role: "user",
                        content: `Carefully analyze my needs by analyzing my preferences against the list of financial products which I provided you. Ensure that you provide a brief recommendation of 3 products which helps the user (Financial analysis), how each product compliments the other products on your list. At the end, list all the recommended 
                        products you selected in this format inbound_sign_in_url, business_website, outbound_business_app, about, logo and business keywords in an array format.`,
                    },
                ];

                let result = await primeResponse(await getFinancialAdvice(messages));
                if (result) {
                    logger.info('advisory created ')
                    logger.info('saving to cache')
                    await redisClient.set(email, JSON.stringify(result), {
                        ex: 120,
                        NX: true
                    })
                    logger.info('cache write successful')
                    user.profile.isNewAdvisoryNeeded = false
                    await user.save();
                    logger.info('updated advisory flag')
                    res.status(200);
                    res.json({
                        result
                    })
                }else{
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
            logger.info(' item already exists. Lets retrieve from cache')
            const cacheResults = await redisClient.get(email);
            if (cacheResults) {
                let results = JSON.parse(cacheResults);
                logger.info(`pulling item from the advisory cache`)
                res.status(200)
                res.send({
                    results
                })
            }
        }
    } else {
        res.status(400);
        res.json({
            message: "Missing required values or check that you are passing the "
        })
    }
};


const getFinancialAdvice = async (messages) => {
    try {
        const payload = {
            messages: messages,
            max_tokens: 600,
            n: 1,
            model: 'gpt-3.5-turbo',
            temperature: 0.2,
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

/*
const primeResponse = async (advice) => {
    try {
        const indexOfOpeningBracket = advice.indexOf('[');
        const indexOfClosingBracket = advice.indexOf(']');
        const advisory = advice.slice(0, indexOfOpeningBracket);
        const rawProducts = advice.slice(indexOfOpeningBracket + 1, indexOfClosingBracket);

        let cleanedProducts = rawProducts.replace(/\\r\\n/g, " ").replace(/\\n/g, " ");

        const productsList = JSON.parse("[" + cleanedProducts.split("},\n{").join("},{") + "]");

        return {advisory, productsList};
    } catch (error) {
        return null
    }
}
*/


const primeResponse = async (advice) => {
    try {
        const indexOfOpeningBracket = advice.indexOf('[');
        const indexOfClosingBracket = advice.lastIndexOf(']'); // Changed to lastIndexOf to avoid issues if there are more brackets
        const advisory = advice.slice(0, indexOfOpeningBracket);
        const rawProducts = advice.slice(indexOfOpeningBracket, indexOfClosingBracket + 1); // Include the closing bracket

        // Removed unnecessary cleaning, as the provided JSON is already valid
        const productsList = JSON.parse(rawProducts);

        return {advisory, productsList};
    } catch (error) {
        return null
    }
}