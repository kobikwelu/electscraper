
const mongoose = require('mongoose');
const db = require('../dbConnect').get();



const categorySchema = new mongoose.Schema({
   name: String
});


categorySchema.query.byName = function (name) {
    return this.where({name});
};


const CategorySchema = db.model('category', categorySchema);

module.exports = CategorySchema;