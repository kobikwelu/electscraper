
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    image: String,
    thumbnail: String,
    timestamp: String,
    category: String,
    author: String,
    url: String,
    isBreaking: { type: Boolean, default: false }
});


postSchema.query.byTitle = function (title) {
    return this.where({title});
};


const PostSchema = db.model('post', postSchema);

module.exports = PostSchema;