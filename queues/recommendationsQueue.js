const Bull = require('bull');
const recommendationsQueue = new Bull('recommendations');
const {recommendationController} = require('../controllers')
const FinancialRecommendation = require('../models/FinancialRecommendation')

recommendationsQueue.process(async (job) => {
    logger.info('processing worker for FinancialRecommendation.js')
    const {user, productsToProcess} = job.data;
    let recommendationsHaul = [];
    for (const product of productsToProcess) {
        let recommendation = await recommendationController.interactWithChatGPTKnowledgeBase(user, product);
        recommendationsHaul.push(recommendation);
    }
    logger.info('starting the data reconcillation process')
    let advisorKey = user.email + 'chatgptadvisory'
    let staleAdvisory = await redisClient.get(advisorKey)
    let advisoryList = await pruneNullContent(recommendationsHaul, staleAdvisory)
    let topTwoAdvisory = await returnTopTwoAdvisory(advisoryList)
    await redisClient.del(advisorKey);
    logger.info('stale advisory successfully deleted')
    await redisClient.set(advisorKey, JSON.stringify(topTwoAdvisory), {
        ex: 120,
        NX: true
    })

    //TODO- Fix. Need to insert with email to help recommendation list
    logger.info('new advisory saved to cache successfully')
    logger.info('--------------- ' + topTwoAdvisory)
    const advisoryFeedback = await FinancialRecommendation.insertMany(advisoryList)
    logger.info(`latest advisory saved in tbe db---------- ${advisoryFeedback}`)
    logger.info('completed all processes!')
    return Promise.resolve(recommendationsHaul);
});


const pruneNullContent = async (recommendationsHaul, staleAdvisory) => {
    recommendationsHaul.push(staleAdvisory);
    return recommendationsHaul.filter((product) => product !== null);
}

const returnTopTwoAdvisory = async (advisory)=>{
    return advisory.slice(0, 2);
}

module.exports = recommendationsQueue