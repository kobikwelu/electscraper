const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('../config')

const s3Client = new S3Client({
    region: 'us-west-1',
    credentials: {
        accessKeyId: config.aws.AWS_KEY,
        secretAccessKey: config.aws.AWS_SECRET
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: config.aws.AWS_BUCKET,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '-' + file.originalname);
        }
    })
});

module.exports = {upload, s3Client};
