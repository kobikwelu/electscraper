

const express = require('express');
const router = express.Router();

const { blogController }  = require('../../../controllers');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY,
    region: 'us-west-2' // or your preferred region
});

const s3 = new aws.S3();

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, {fieldName: file.fieldname});
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString())
        }
    })
});


/*
* *********************************GET*****************************************
*/

router.post('/post', upload.array('image', 'thumbnail'), blogController.createPost);

router.get('/post', blogController.getPost);

router.get('/posts', blogController.getPosts);

module.exports = router;