
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    image: String,
    timestamp: { type: Date, default: Date.now },  // Updated this line
    category: String,
    author: String,
    url: String,
    imageCopyright: String,
    isBreakingNews: {
        type: Boolean,
        default: false,
    }
});


postSchema.query.byTitle = function (title) {
    return this.where({title});
};


const PostSchema = db.model('post', postSchema);

module.exports = PostSchema;