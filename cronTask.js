const { contentController } = require('./controllers');
const config = require("./config");
const {totalWords, maxToken, postKeywords} = config


async function runTask() {
    logger.info(`generating new posts for today ${Date.now()}`);
    try {
        let keywords = postKeywords.split(',')
        for (const keyword of keywords) {
            await contentController.generatePosts(keyword, maxToken, totalWords, 'unsplash');
        }
        logger.info(`completed generating posts`);
    } catch (ex) {
        logger.info(ex);
    }
}

(async function() {
    try {
        await runTask();
    } catch (e) {
        console.error(e);
    }
})();
