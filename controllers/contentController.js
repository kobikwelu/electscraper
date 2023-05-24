const API_URL = 'https://api.openai.com/v1/chat/completions';
const config = require('../config');
const axios = require('axios');
const AWS = require('aws-sdk');
const {AWS_BUCKET, AWS_KEY, AWS_SECRET} = config.aws
const {access_key, secret_key} = config.unsplash
const shutterStock = require("shutterstock-api");
const postController = require('./postController')
shutterStock.setAccessToken(config.shutterStock_api_key);

AWS.config.update({
    region: 'us-west-1',
    accessKeyId: AWS_KEY,
    secretAccessKey: AWS_SECRET
});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

exports.generatePosts = async (keyword, max_tokens, total_words, imageSource = null) => {
    let image;
    let thumbnail;
    try {
        logger.info(`starting process`)
        const prompt = `Write a SEO optimized blog post about ${keyword} in less than ${total_words} words. 
    Response should be in an object json format. It should have a title, content and category attributes`;
        const imageQueryParams = {
            "query": `${keyword}`,
            "sort": "random",
            "orientation": "horizontal"
        };
        let post = await getContentFromChatGPT(prompt, max_tokens)
        let processedPostContent = await processContentResponseFromChatGpt(post)
        logger.info(processedPostContent[0])
        logger.info(processedPostContent[1])
        logger.info(processedPostContent[2])
        logger.info(`content for ${keyword} has been provisioned`)
        let author = 'Tally'
        if (imageSource === 'shuttershock') {
            let s3imageUrlFromShutterStock = await getAndProcessImageFromShutterStock(imageQueryParams)
            image = s3imageUrlFromShutterStock[0];
            thumbnail = s3imageUrlFromShutterStock[1]
            console.log(`images for ${keyword} has been provisioned and saved to s3`)
        } else if (imageSource === 'unsplash') {
            let imageUrlFromUnsplash = await getAndProcessImagesFromUnsplash(imageQueryParams)
            image = imageUrlFromUnsplash.data.urls.regular;
            thumbnail = imageUrlFromUnsplash.data.urls.thumb;
        }
        let postUpdate = await postController.persistPostInDBAndCache(processedPostContent[0],
            processedPostContent[2], image, thumbnail,
            processedPostContent[1], author)
        logger.info(`completed saving the automated post for ${keyword}`)
    } catch (error) {
        logger.error(error)
    }
}

const getContentFromChatGPT = async (prompt, max_tokens) => {
    try {
        const payload = {
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: parseInt(max_tokens),
            n: 1,
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
        };

        const requestOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.openAi.API_KEY}`,
            },
        };

        const response = await axios.post(API_URL, payload, requestOptions);
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        logger.info(error)
    }
};

const getAndProcessImageFromShutterStock = async (imageQueryParams) => {
    console.log('starting image generation and processing process')
    try {
        const imagesApi = new shutterStock.ImagesApi();
        const data = await imagesApi.searchImages(imageQueryParams);
        console.log('image found from shutterStock')
        if (data.data.length > 0) {
            console.log('transpiling image')
            const [image, thumbnail] = await Promise.all([
                axios.get(data.data[0].assets.preview.url, {responseType: 'arraybuffer'}),
                axios.get(data.data[0].assets.small_thumb.url, {responseType: 'arraybuffer'})
            ]);
            console.log('image transpiling completed')
            const imageParams = {
                Bucket: AWS_BUCKET,
                Key: `${imageQueryParams.query}_image.jpg`,
                Body: image.data,
                ACL: 'public-read'
            };

            const thumbnailParams = {
                Bucket: AWS_BUCKET,
                Key: `${imageQueryParams.query}_thumb.jpg`,
                Body: thumbnail.data,
                ACL: 'public-read'
            };
            return [imageUpload, thumbnailUpload] = await Promise.all([
                s3.upload(imageParams).promise(),
                s3.upload(thumbnailParams).promise()
            ]);
        }
    } catch (error) {
        console.log(error)
    }
}

const getAndProcessImagesFromUnsplash = async (imageQueryParams) => {
    return await axios.get(`https://api.unsplash.com/photos/random?query=${imageQueryParams.query}&client_id=${access_key}`);
}

const processContentResponseFromChatGpt = async (rawChatResponse) => {
    let strippedStringWithNoBraces = rawChatResponse.trim().substring(1, rawChatResponse.length - 2);
    let partsString = strippedStringWithNoBraces.split(/"(title|category|content)": "/);
    let titleStr = partsString[2].split('",')[0].replace(/[:{}"]/g, '');
    let categoryStr = partsString[4].split('",')[0].replace(/[:{}"]/g, '');
    let contentStr = partsString[6].split('"\n}')[0].replace(/[:{}"]/g, '');
    return [titleStr, categoryStr, contentStr];
}
