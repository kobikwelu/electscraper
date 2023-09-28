

const recommendationController = require('./recommendationController');
const recommendationControllerV2 = require('./recommendationControllerV2');
const authController = require('./authController');
const postController = require('./postController');
const statusController = require('./statusController');
const financialGuidesController = require('./financialGuidesController');

module.exports = {
    recommendationController,
    authController,
    postController,
    statusController,
    financialGuidesController,
    recommendationControllerV2
}
