const mongoose = require('mongoose');

const Schema = mongoose.Schema;

module.exports = new Schema({
    title: {
        type: String,
        required: true
    },
    data: [{
        author: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        rating: {
            type: String,
            required: true
        }
    }]
});
