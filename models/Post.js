
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    image: String,
    thumbnail: String,
    timestamp: String,
    category: String,
    author: String
});


postSchema.query.byTitle = function (title) {
    return this.where({title});
};


const PostSchema = db.model('post', postSchema);

module.exports = PostSchema;