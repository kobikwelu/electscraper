const { contentController } = require('./controllers');
const config = require("./config");
const {totalWords, maxToken, postKeywords} = config


async function runTask() {
    console.log(`generating new posts for today ${Date.now()}`);
    try {
        let keywords = postKeywords.split(',')
        for (const keyword of keywords) {
            await contentController.generatePosts(keyword, maxToken, totalWords, 'unsplash');
        }
        console.log(`completed generating posts`);
    } catch (ex) {
        console.log(ex);
    }
}

(async function() {
    try {
        await runTask();
    } catch (e) {
        console.error(e);
    }
})();
