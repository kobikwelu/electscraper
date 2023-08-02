
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const breakingPostSchema = new mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }
});


const BreakingPostSchema = db.model('breakingpost', breakingPostSchema);

module.exports = BreakingPostSchema;